var fs = require("fs");
var path = require("path");
var mime = require("mime");
var express = require("express");
var logger = require("../core/logger").getLogger(path.basename(__filename));

path.removeRelativePrefix = function (url) {
  while (url[0] === '.' || url[0] === '/') {
    url = url.substr(1);
  }
  return url;
};
/** 
 * Serves files defined in a freedom.js manifest file and in all of its
 * dependencies. All files are served relative to the manifest.app.index.
 * This means that the index page must be at the highest level in the file structure
 * relative to other scripts and dependencies
 * 
 * @constructor
 * @param {Boolean} dbg - turn on debugging
 **/
var FileServer = function(dbg) {
  "use strict";
  logger.trace('constructor: enter');

  this.files = {};
  this.manifests = {};
  this.indexFilename = null;
  this.indexDirectory = null;
  this.debug = null;
  if (typeof dbg === 'undefined') {
    this.debug = false;
  } else {
    this.debug = dbg;
  }
};


/**
 * Read through a manifest and setup the file server
 * @method
 * @param {String} url - path to the manifest file
 **/
FileServer.prototype.serveModule = function(url) {
  "use strict";

  fs.readFile(url, function(err, file) {
    // Error reading manifest file
    if (err) {
      throw err;
    }

    // Parse the manifest
    var manifest = JSON.parse(file);

    // File server needs a index page to serve. 
    if (!this.indexFilename && (!manifest.app || !manifest.app.index)) {
      logger.warn("No root manifest.app.index found: file server will not serve anything.");
      return;
    }
    
    // Determine where we are
    var manifestAbsolutePath = path.resolve(url);
    var manifestFilename = path.basename(url);
    var manifestDirectory = path.dirname(manifestAbsolutePath);

    // Only set the index with the root module (this method is recursive)
    if (!this.indexFilename || !this.indexDirectory) {
      this.indexFilename = path.basename(manifest.app.index);
      this.indexDirectory = path.dirname(path.join(manifestDirectory, manifest.app.index));
    }
    this.manifests[path.relative(this.indexDirectory, manifestAbsolutePath)] = manifest;

    // Find all the files in the manifest (e.g. scripts, statics, views)
    var files = [];
    if (manifest.app && manifest.app.static) { files = files.concat(manifest.app.static); }
    if (manifest.app && manifest.app.script) { files = files.concat(manifest.app.script); }
    if (manifest.app && manifest.app.index) { files = files.concat(manifest.app.index); }
    if (manifest.views) {
      for (var k in manifest.views) {
        if (manifest.views.hasOwnProperty(k)) {
          if (manifest.views[k].hasOwnProperty('main')) {
            files.push(manifest.views[k].main);
          } 
          if (manifest.views[k].hasOwnProperty('files')) {
            files = files.concat(manifest.views[k].files);
          }
        }
      }
    }

    // Map the file to the correct path relative to indexDirectory
    files.forEach(function(file) {
      var fileAbsPath = path.resolve(manifestDirectory, file);
      var fileRelPath = path.relative(this.indexDirectory, fileAbsPath);
      if (fileRelPath.indexOf("../") < 0) {
        this.files[fileRelPath] = fileAbsPath;
      } else {
        fileRelPath = path.removeRelativePrefix(fileRelPath);
        this.files[fileRelPath] = fileAbsPath;
        logger.warn("Shifted relative path: " + fileRelPath + "=>" + fileAbsPath);
      }
    }.bind(this));

    // Recurse with dependencies
    if (manifest.dependencies) {
      for (var dep in manifest.dependencies) {
        if (manifest.dependencies.hasOwnProperty(dep)) {
          var depURL = manifest.dependencies[dep].url;
          this.serveModule(path.join(manifestDirectory, depURL));
        }
      }
    }

  }.bind(this));
};

/**
 * The express.js route. Read the request and serve
 * the appropriate file
 * @method
 * @param {request} req - express.js request
 * @param {response} res - express.js response
 * @param {Function} next - function to call to advance to next route
 **/
FileServer.prototype.route = function(req, res, next) {
  "use strict";
  // Remove leading '/'
  if (req.url.length && req.url[0] === '/') {
    req.url = req.url.substr(1);
  }
  // Check if grabbing index
  if ((!req.url || req.url === '') && this.indexFilename) {
    // Establish a CSRF Token for the session
    var token = req.csrfToken();
    req.session.customCSRF = token;
    res.cookie('XSRF-TOKEN', token);
    req.url = this.indexFilename;
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

/** 
* Error handling route
* @method
 * @param {request} req - express.js request
 * @param {response} res - express.js response
**/
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
 * Helper function to check if the request is authenticated
 * by passport.js
 * @method
 * @param {request} req - express.js request
 * @param {response} res - express.js response
 * @param {Function} next - function to call to advance to next route
 **/
FileServer.prototype.ensureAuthenticated = function(req, res, next) {
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
};

// This module is a singleton
var router;
var server;
module.exports.initialize = function(manifest, debug) {
  "use strict";
  if (typeof router !== "undefined") {
    return router;
  }

  router = express.Router();
  server = new FileServer(debug);
  server.serveModule(manifest);
  router.get('*', server.ensureAuthenticated.bind(server), server.route.bind(server));
  module.exports.router = router;
  return router;
};
