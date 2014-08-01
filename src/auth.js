var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var router = express.Router();
var User = require('./user');

passport.use(new LocalStrategy(function(username, password, done) {
    console.log("start");
  User.findOne({ 'local.username': username }, function(err, user) {
    if (err) { 
      console.error(err);
      return done(err); 
    }
    if (!user || !user.validPassword(password)) {
      console.log('incorrect');
      return done(null, false, req.flash('loginMessage', 'Incorrect username/password'));
    }
    console.log("good");
    return done(null, user);
  });
}));
/** 
passport.use('local-signup', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, function(req, username, password, done) {
    console.log("start");
  process.nextTick(function() {
    console.log("start");
    User.findOne({ 'local.username': username }, function(err, user) {
      if (err) {
        console.error(err);
        return done(err);
      } else if (user) {
        console.error('taken');
        return done(null, false, req.flash('loginMessage', 'That username is already taken'));
      }

      console.log(username);
      console.log(password);
      var newUser = new User();
      newUser.local.username = username;
      newUser.local.password = newUser.generateHash(password);
      newUser.save(function(err) {
        if (err) {
          console.error(err);
          throw err;
        }
        return done(null, newUser);
      });
    }); //User.findOne
  }); //process.nextTick
})); //passport.Use
**/
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

router.post('/login', passport.authenticate('local', { 
  failureRedirect: '/b'
}), function(req, res) {
  console.log("!!!");
});

/**
router.post('/signup', passport.authenticate('local-signup', { 
  successRedirect: '/c',
  failureRedirect: '/d',
  failureFlash: true
}));
**/

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

module.exports = router
