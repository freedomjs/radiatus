var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var router = express.Router();
var User = require('../models/user');

/** PASSPORT.JS STRATEGIES **/
// Setup the passport.js strategy for local logins
passport.use('local-login', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, function(req, username, password, done) {
  "use strict";
  User.findOne({ username: username }, function(err, user) {
    if (err) { return done(err); }
    if (!user) { return done(null, false, req.flash('loginMessage', 'Incorrect username/password')); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) { return done(err); }
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, req.flash('loginMessage', 'Incorrect username/password'));
      }
    });
  });
}));

// Setup the passport.js strategy for local signups
passport.use('local-signup', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, function(req, username, password, done) {
  "use strict";
  process.nextTick(function() {
    User.findOne({ 'username': username }, function(err, user) {
      if (err) { return done(err); } 
      if (user) { return done(null, false, req.flash('loginMessage', 'That username is already taken')); }
      var newUser = new User();
      newUser.username = username;
      newUser.password = password;
      newUser.name.familyName = req.body.familyName;
      newUser.name.givenName = req.body.givenName;
      newUser.save(function(err) {
        if (err) { throw err;}
        return done(null, newUser);
      });
    }); //User.findOne
  }); //process.nextTick
})); //passport.Use

// Identify the user by their id from Mongo
passport.serializeUser(function(user, done) {
  "use strict";
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  "use strict";
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Helper function to ensure a user is logged in
function ensureAuthenticated(req, res, next) {
  "use strict";
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/radiatus/auth/login');
}

/** ROUTES **/
router.post('/login', passport.authenticate('local-login', { 
  successRedirect: '/',
  failureRedirect: '/radiatus/auth/login',
  failureFlash: true
}));

router.post('/signup', passport.authenticate('local-signup', { 
  successRedirect: '/',
  failureRedirect: '/radiatus/auth/login',
  failureFlash: true
}));

router.get('/account', ensureAuthenticated, function(req, res){
  "use strict";
  res.render('account', { user: req.user });
});

router.get('/login', function(req, res){
  "use strict";
  res.render('login', { 
    user: req.user,
    message: req.flash('loginMessage'),
    csrf: req.csrfToken()
  });
});

router.get('/logout', function(req, res) {
  "use strict";
  req.logout();
  res.redirect('/');
});

router.get('/*', function(req, res) {
  "use strict";
  res.redirect('/radiatus/auth/account');
});

module.exports.router = router;
