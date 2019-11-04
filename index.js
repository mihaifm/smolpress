const fs = require('fs');
const express = require('express');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const ensureLogin = require('connect-ensure-login').ensureLoggedIn;
const multer = require('multer')();
const sharp = require('sharp');
const users = require('./lib/users.js');
const builder = require('./lib/builder.js');
const utils = require('./lib/utils.js');
const config = builder.getConfig();

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

app.set('views', `themes/${config.theme}/views`);
app.set('view engine', 'ejs');
app.use(express.static(builder.dirs.out));
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({
  secret: process.env['SMOL_SESSION_SECRET'] || utils.randomString(16),
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/admin', ensureLogin(), (req, res) => {
  res.redirect('/content');
})

app.get('/content', ensureLogin(), (req, res) => {
  res.render('content', { user: req.user, pages: builder.getPages() });
});

app.get('/login', (req, res) => {
  if (users.empty())
    res.redirect('signup');
  else
    res.render('login');
});

app.get('/signup', (req, res) => {
  if (users.empty())
    res.render('signup');
  else
    res.redirect('/');
});

app.post('/signup', (req, res) => {
  if (req.body.password == req.body.passconfirm) {
    users.create(req.body.username, req.body.password);
    res.redirect('/login');
  }
  else {
    res.send("Passwords don't match. Hit back and try again");
  }
});

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login' }),
  (req, res) => { res.redirect('/content'); }
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/settings', ensureLogin(), (req, res) => {
  res.render('settings', Object.assign({user: req.user}, builder.getConfig()));
});

app.post('/settings', ensureLogin(), (req, res) => {
  var status = builder.setConfig(req.body);
  builder.build();
  var viewData = Object.assign({user: req.user}, builder.getConfig());
  viewData.message = status;
  res.render('settings', viewData);
});

app.post('/posts', ensureLogin(), (req, res) => {
  var slug = utils.slugify(req.body.title);
  var filename = `${builder.dirs.src}/pages/${slug}.md`;
  fs.writeFileSync(filename, `---\ntitle: ${req.body.title}\n---\n# ${req.body.title}`);

  builder.buildPage(`${slug}.md`);
  builder.buildIndex();
  res.redirect("/" + slug + "/edit");
});

app.get('/:slug/edit', ensureLogin(), (req, res) => {
  var filename = `${builder.dirs.src}/pages/${req.params.slug}.md`;
  if (fs.existsSync(filename)) {
    res.render('editor', {
      content: fs.readFileSync(filename, 'utf8'),
      saveurl: `/${req.params.slug}/save`
    });
  }
  else {
    res.redirect("/" + req.params.slug);
  }
});

app.post('/:slug/save', ensureLogin(), (req, res) => {
  var filename = `${builder.dirs.src}/pages/${req.params.slug}.md`;
  fs.writeFileSync(filename, req.body.content);
  builder.buildPage(`${req.params.slug}.md`);
  builder.buildIndex();
  res.redirect("/" + req.params.slug);
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

  comments.push({name: req.body.name, text: req.body.text, id: Date.now()})
  fs.writeFileSync(filename, JSON.stringify(comments));

  builder.buildPage(`${req.params.slug}.md`);
  res.redirect("/" + req.params.slug + "#comments");
})

app.get('/media', ensureLogin(), (req, res) => {
  var images = [];
  fs.readdirSync(`${builder.dirs.src}/media/`).forEach(file=> {
    images.push({name: file, url: `/media/${file}`})
  })

  res.render('media', Object.assign({user: req.user, images}, builder.getConfig()));
})

app.post('/upload', ensureLogin(), multer.single('image'), function (req, res){
  var imagePath = `${builder.dirs.src}/media/${req.file.originalname}`;

  var w = req.body.width ? parseInt(req.body.width) : null;
  var h = req.body.height ? parseInt(req.body.height) : null;

  if (req.body.resize) {
    sharp(req.file.buffer).resize(w, h, { 
      fit: sharp.fit.inside, 
      withoutEnlargement: true 
    }).toFile(imagePath, (err, info) => {
      fs.copyFile(imagePath, `${builder.dirs.out}/media/${req.file.originalname}`, (err) => {
        if (err) throw err;
      });

      res.redirect('/media');
    });
  } else {
    fs.writeFileSync(imagePath, req.file.buffer);
    fs.copyFile(imagePath, `${builder.dirs.out}/media/${req.file.originalname}`, (err) => {
      if (err) throw err;
    });

    res.redirect('/media');
  }
});

builder.build();

var listener = app.listen(process.env['SMOL_PORT'] || 3939, () => {
  console.log(`Server started on port ${listener.address().port}`)
});