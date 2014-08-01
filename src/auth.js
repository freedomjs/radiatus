var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var router = express.Router();
var User = require('./user');

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use('local-login', new LocalStrategy(function(username, password, done) {
  User.findOne({ username: username }, function(err, user) {
    if (err) { return done(err); }
    if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid password' });
      }
    });
  });
}));

/** 
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

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:8080/login
//   
/***** This version has a problem with flash messages
router.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  });
*/

// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.
router.post('/login', function(req, res, next) {
  passport.authenticate('local-login', function(err, user, info) {
    if (err) { return next(err) }
    if (!user) {
      req.session.messages =  [info.message];
      return res.redirect('/radiatus/auth/login')
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
});

router.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.session.messages, csrf: req.csrfToken()});
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/radiatus/auth/login')
}
router.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

/**
router.post('/login', passport.authenticate('local', { 
  failureRedirect: '/b'
}), function(req, res) {
  console.log("!!!");
});

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
