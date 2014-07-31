var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var router = express.Router();
var User = require('./user');

passport.use('local-login', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, function(req, username, password, done) {
  User.findOne({ 'local.username': username }, function(err, user) {
    if (err) { return done(err); }
    if (!user || !user.validPassword(password)) {
      return done(null, false, req.flash('loginMessage', 'Incorrect username/password'));
    }
    return done(null, user);
  });
}));

passport.use('local-signup', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, function(req, username, password, done) {
  process.nextTick(function() {
    User.findOne({ 'local.username': username }, function(err, user) {
      if (err) {
        return done(err);
      } else if (user) {
        return done(null, false, req.flash('loginMessage', 'That username is already taken'));
      }

      var newUser = new User();
      newUser.local.username = username;
      newUser.local.password = newUser.generateHash(password);
      newUser.save(function(err) {
        if (err) {
          throw err;
        }
        return done(null, newUser);
      });
    }); //User.findOne
  }); //process.nextTick
})); //passport.Use

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

router.post('/login', passport.authenticate('local-login', { 
  successRedirect: '/',
  failureRedirect: '/',
  failureFlash: true
}));

router.post('/signup', passport.authenticate('local-signup', { 
  successRedirect: '/',
  failureRedirect: '/',
  failureFlash: true
}));

router.post('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

module.exports = router
