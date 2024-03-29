const fs = require('fs');
const path = require('path');
const express = require('express');
const serveStatic = require('serve-static');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const ensureLogin = require('connect-ensure-login').ensureLoggedIn;
const multer = require('multer')();
const sharp = require('sharp');
const users = require('./lib/users.js');
const builder = require('./lib/builder.js');
const utils = require('./lib/utils.js');
const mailer = require('./lib/mailer.js');

// Build the static site first
builder.build();
var config = builder.getConfig();

// Configure the local strategy for Passport
passport.use(new Strategy(function(username, password, cb) {
    users.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (!users.validate(user, password)) { return cb(null, false); }
      return cb(null, user);
    });
}));

passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  users.findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});

// Express app setup
var app = express();

app.set('views', `themes/${config.adminTheme}/views`);
app.set('view engine', 'ejs');

app.use(serveStatic(builder.dirs.out, {
  setHeaders: (res, reqpath) => {
    if (utils.isTextFile(reqpath)) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `inline; filename="${path.parse(reqpath).base}"`);
    }
  }
}));

app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({
  secret: process.env['SMOLPRESS_SESSION_SECRET'] || utils.randomString(16),
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/admin', ensureLogin(), (req, res) => {
  res.redirect('/content');
})

app.get('/content', ensureLogin(), (req, res) => {
  res.render('content', { user: req.user, pages: builder.getPages(), config: builder.getConfig() });
});

app.get('/login', (req, res) => {
  if (users.empty())
    res.redirect('signup');
  else
    res.render('login', {config: builder.getConfig()});
});

app.get('/signup', (req, res) => {
  if (users.empty())
    res.render('signup', {config: builder.getConfig()});
  else
    res.redirect('/');
});

app.post('/signup', (req, res) => {
  if (req.body.password == req.body.passconfirm) {
    if (req.body.username.length == 0) {
      res.send("Username cannot be blank");
    }
    else {
      users.create(req.body.username, req.body.password);
      res.redirect('/login');
    }
  }
  else {
    res.send("Passwords don't match. Hit back and try again");
  }
});

app.post('/login',
  passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' }),
  (req, res) => { res.redirect('/content'); }
);

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/settings', ensureLogin(), (req, res) => {
  res.render('settings', Object.assign({user: req.user}, {config: builder.getConfig()}));
});

app.post('/settings', ensureLogin(), (req, res) => {
  var status = builder.setConfig(req.body);
  builder.build();
  config = builder.getConfig();
  app.set('views', `themes/${config.adminTheme}/views`);
  var viewData = Object.assign({user: req.user}, {config: builder.getConfig()});
  viewData.message = status;
  res.render('settings', viewData);
});

app.post('/posts', ensureLogin(), (req, res) => {
  var slug = utils.slugify(req.body.title);
  var filename = `${builder.dirs.src}/pages/${slug}.md`;
  
  var draft = '';
  if (req.body.draft) {
    draft = 'draft: true\n';
  }

  var metadata = `---\ntitle: ${req.body.title}\n${draft}---\n# ${req.body.title}`;
  fs.writeFileSync(filename, metadata);

  builder.buildPage(`${slug}.md`);
  builder.buildIndex();
  
  res.redirect("/" + slug + "/edit");
});

app.get('/:slug/edit', ensureLogin(), (req, res) => {
  var filename = `${builder.dirs.src}/pages/${req.params.slug}.md`;
  if (fs.existsSync(filename)) {
    res.render('editor', {
      config: builder.getConfig(),
      content: fs.readFileSync(filename, 'utf8'),
      saveurl: `/${req.params.slug}/save`
    });
  }
  else {
    res.redirect("/" + req.params.slug);
  }
});

app.get('/:slug/delete', ensureLogin(), (req, res) => {
  var filename = `${builder.dirs.src}/pages/${req.params.slug}.md`;
  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }

  var datadir = `${builder.dirs.data}/${req.params.slug}`;
  if (fs.existsSync(datadir)) {
    fs.rmSync(datadir, {recursive: true});
  }

  builder.build();
  res.redirect("/content");
});

app.post('/:slug/save', ensureLogin(), (req, res) => {
  var filename = `${builder.dirs.src}/pages/${req.params.slug}.md`;
  fs.writeFileSync(filename, req.body.content);
  var page = builder.buildPage(`${req.params.slug}.md`);
  builder.buildIndex();
  if (page.draft) {
    res.redirect("/" + req.params.slug + "/edit");
  }
  else {
    res.redirect("/" + req.params.slug);
  }
})

app.post('/:slug/comments', (req, res) => {
  var filename = `${builder.dirs.data}/${req.params.slug}/comments.json`;
  var comments = [];
  if (fs.existsSync(filename)) {
    comments = JSON.parse(fs.readFileSync(filename));
  }
  else {
    fs.mkdirSync(`${builder.dirs.data}/${req.params.slug}`);
    fs.writeFileSync(filename, "[]");
  }

  if (req.body.name && req.body.text &&
      comments.length < builder.getConfig().maxComments &&
      req.body.text.length >= 2 && req.body.name.length <= 256 &&
      req.body.text.length <= builder.getConfig().maxCommentLength) {
    const pages = builder.getPages();
    const page = pages.find(el => el.name.indexOf(req.params.slug) == 0)

    if (page && page.comments == false) {
      return res.redirect("/" + req.params.slug);
    }
    
    const comment = {name: req.body.name, text: req.body.text, id: Date.now(), slug: req.params.slug};
    comments.push(comment);
    fs.writeFileSync(filename, JSON.stringify(comments));

    config = builder.getConfig();
    if (config.emailNotifications) {
      mailer.mail(comment, page, config);
    }

    builder.buildPage(`${req.params.slug}.md`);
  }

  res.redirect("/" + req.params.slug + "#comments");
})

app.get('/media', ensureLogin(), (req, res) => {
  var images = [];
  fs.readdirSync(`${builder.dirs.src}/media/`).forEach(file=> {
    images.push({name: file, url: `/media/${file}`})
  })

  res.render('media', { user: req.user, images, config: builder.getConfig() });
})

app.post('/cleanup', ensureLogin(), (req, res) => {
  Object.keys(req.body).forEach(file => {
    if (fs.existsSync(`${builder.dirs.src}/media/` + file)) {
      fs.unlinkSync(`${builder.dirs.src}/media/` + file)
    }
  })

  res.redirect('/media');
})

app.get('/comments', ensureLogin(), (req, res) => {
  var comments = [];

  fs.readdirSync(`${builder.dirs.data}`).forEach(entry => {
    if (fs.lstatSync(`${builder.dirs.data}/` + entry).isDirectory()) {
      const commentsFilePath = `${builder.dirs.data}/` + entry + '/comments.json';
      if (fs.existsSync(commentsFilePath)) {
        JSON.parse(fs.readFileSync(commentsFilePath)).forEach(c => comments.push(c))
        comments.sort((a, b) => (b.id - a.id))
      }
    }
  })

  res.render('comments', { user: req.user, comments, config: builder.getConfig() })
})

app.get('/moderate/:slug/:cid', ensureLogin(), (req, res) => {
  var filename = `${builder.dirs.data}/${req.params.slug}/comments.json`;

  var comments = [];
  if (fs.existsSync(filename)) {
    comments = JSON.parse(fs.readFileSync(filename));
  }
  else {
    res.redirect('/comments');
  }

  fs.writeFileSync(filename, JSON.stringify(comments.filter(c => c.id != req.params.cid)));

  builder.buildPage(`${req.params.slug}.md`);
  
  res.redirect('/comments');
});

app.get('/approve/:slug/:cid', ensureLogin(), (req, res) => {
  var filename = `${builder.dirs.data}/${req.params.slug}/comments.json`;

  var comments = [];
  if (fs.existsSync(filename)) {
    comments = JSON.parse(fs.readFileSync(filename));
  }
  else {
    res.redirect('/comments');
  }

  for (const c of comments) {
    if (c.id == req.params.cid)
      c.approved = true;
  }

  fs.writeFileSync(filename, JSON.stringify(comments));

  builder.buildPage(`${req.params.slug}.md`);

  res.redirect('/comments');
});

app.post('/upload', ensureLogin(), multer.single('image'), function (req, res) {
  var filename = req.body.rename ? req.body.rename : req.file.originalname;
  var imagePath = `${builder.dirs.src}/media/${filename}`;

  var w = req.body.width ? parseInt(req.body.width) : null;
  var h = req.body.height ? parseInt(req.body.height) : null;

  if (req.body.resize) {
    sharp(req.file.buffer).rotate().resize(w, h, {
      fit: sharp.fit.inside, 
      withoutEnlargement: true 
    }).toFile(imagePath, (err, info) => {
      fs.copyFile(imagePath, `${builder.dirs.out}/media/${filename}`, (err) => {
        if (err) throw err;
      });

      res.redirect('/media');
    });
  } else {
    fs.writeFileSync(imagePath, req.file.buffer);
    fs.copyFile(imagePath, `${builder.dirs.out}/media/${filename}`, (err) => {
      if (err) throw err;
    });

    res.redirect('/media');
  }
});

var listener = app.listen(process.env['SMOLPRESS_PORT'] || 3939, () => {
  console.log(`Server started on port ${listener.address().port}`)
});