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
const routes = require('./lib/routes.js');

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

app.use('/', routes);

var listener = app.listen(process.env['SMOLPRESS_PORT'] || 3939, () => {
  console.log(`Server started on port ${listener.address().port}`)
});