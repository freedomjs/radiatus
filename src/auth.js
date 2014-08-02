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
  User.findOne({ username: username }, function(err, user) {
    if (err) { return done(err); }
    if (!user) { return done(null, false, req.flash('loginMessage', 'Incorrect username/password')); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, req.flash('loginMessage', 'Incorrect username/password'));
      }
    });
  });
}));

passport.use('local-signup', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, function(req, username, password, done) {
  process.nextTick(function() {
    User.findOne({ 'username': username }, function(err, user) {
      if (err) { return done(err); } 
      if (user) { return done(null, false, req.flash('loginMessage', 'That username is already taken')); }
      var newUser = new User();
      newUser.username = username;
      newUser.password = password;
      newUser.save(function(err) {
        if (err) { console.log('!!!'); throw err;}
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
  failureRedirect: '/radiatus/auth/login',
  failureFlash: true
}));

router.post('/signup', passport.authenticate('local-signup', { 
  successRedirect: '/',
  failureRedirect: '/radiatus/auth/login',
  failureFlash: true
}));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/radiatus/auth/login')
}

router.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

router.get('/login', function(req, res){
  res.render('login', { 
    user: req.user,
    message: req.flash('loginMessage'),
    csrf: req.csrfToken()
  });
});

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/*', function(req, res) {
  res.redirect('/radiatus/auth/account');
});

module.exports = router
