var fs = require("fs");
var path = require("path");
var mime = require("mime");
var express = require("express");
var logger = require("../core/logger").getLogger(path.basename(__filename));

/** 
 * Serves files defined in a freedom.js manifest file and in all of its
 * dependencies
 * @constructor
 * @param {Boolean} dbg - turn on debugging
 **/
var FileServer = function(dbg) {
  "use strict";
  logger.trace('constructor: enter');

  this.files = {};
  this.manifests = {};
  this.index = null;
  this.debug = null;
  if (typeof dbg === 'undefined') {
    this.debug = false;
  } else {
    this.debug = dbg;
  }
};

/**
 *
 **/
FileServer.prototype.serveModule = function(prefix, url) {
  "use strict";
  function removeRelativePrefix(str) {
    while(str[0] === '.' || 
          str[0] === '/') {
      str = str.substr(1);
    }
    return str;
  }

  fs.readFile(url, function(err, file) {
    if (err) {
      throw err;
    }
    var filename = path.basename(url);
    var resolvedURL = path.join(prefix, filename);
    var manifest = JSON.parse(file);

    // map Scripts, Statics, Views
    var files = [];
    if (manifest.app && manifest.app.static) { files = files.concat(manifest.app.static); }
    if (manifest.app && manifest.app.script) { files = files.concat(manifest.app.script); }
    if (manifest.app && manifest.app.index) { files = files.concat(manifest.app.index); }
    if (manifest.views) {
      manifest.views.keys().forEach(function(view) {
        files = files.concat(manifest.views[view]);
      });
    }
    if (manifest.app.index && !this.index) {
      this.index = manifest.app.index;
    }

    files.forEach(function(file) {
      var resolvedFile = path.resolve(path.dirname(url), file);
      var fileURL = path.join(prefix, file);
      this.files[removeRelativePrefix(fileURL)] = resolvedFile;
    }.bind(this));

    // map dependencies
    if (manifest.dependencies) {
      for (var dep in manifest.dependencies) {
        if (manifest.dependencies.hasOwnProperty(dep)) {
          var depURL = manifest.dependencies[dep].url;
          var depPrefix = path.join(prefix, dep);
          this.serveModule(depPrefix, path.resolve(path.dirname(url), depURL));
          manifest.dependencies[dep].url =
              path.join(depPrefix, path.basename(depURL));
        }
      }
    }
    this.manifests[resolvedURL] = manifest;

  }.bind(this));
};

// Handle web requests against known files.
FileServer.prototype.route = function(req, res, next) {
  "use strict";
  // Remove leading '/'
  if (req.url.length && req.url[0] === '/') {
    req.url = req.url.substr(1);
  }
  // Check if grabbing index
  if ((!req.url || req.url === '') && this.index) {
    // Establish a CSRF Token for the session
    var token = req.csrfToken();
    req.session.customCSRF = token;
    res.cookie('XSRF-TOKEN', token);
    req.url = this.index;
  }
  
  if (this.files[req.url]) {
    fs.readFile(this.files[req.url], {encoding: "binary"}, function(err, file) {
      if (err) {
        logger.warn('Error reading ' + req.url + ':' + this.files[req.url] + " - " + err);
        this.sendError(req, res);
        return;
      }
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': mime.lookup(this.files[req.url])
      });
      res.write(file, "binary");
      res.end();
    }.bind(this));
  } else if (this.manifests[req.url]) {
    var data = JSON.stringify(this.manifests[req.url]);
    res.writeHead(200, {
      'Content-Length': data.length,
      'Content-Type': 'application/json'
    });
    res.write(data);
    res.end();
  } else {
    logger.debug("404:"+req.url);
    this.sendError(req, res);
  }
};

/** ERROR HANDLING **/
FileServer.prototype.sendError = function(req, res) {
  "use strict";
  logger.warn("Generating error");
  var err = new Error('Not Found');
  err.status = 404;
  res.status(err.status);
  
  if (this.debug) {
    res.render('error', {
      user: req.user,
      message: err.message,
      status: err.status,
      stack: err.stack
    });
  } else {
    res.render('error', {
      user: req.user,
      message: err.message,
      status: err.status,
      stack: ''
    });
  }
};

/**
 **/
function ensureAuthenticated(req, res, next) {
  "use strict";
  if (req.isAuthenticated()) {
    //logger.trace('Authenticated as ' + req.user.username);
    //res.render('account', { user: req.user });
    next();
  } else {
    logger.warn("Not authenticated");
    res.render("login", { 
      user: req.user, 
      message: req.flash("loginMessage"),
      csrf: req.csrfToken()
    });
  }
}

/**
 * This module is a Singleton
 **/
var router;
var server;
module.exports.initialize = function(manifest, debug) {
  "use strict";
  if (typeof router !== "undefined") {
    return router;
  }

  router = express.Router();
  server = new FileServer(debug);
  server.serveModule('./', manifest);
  router.get('*', ensureAuthenticated, server.route.bind(server));
  module.exports.router = router;
  return router;
};
