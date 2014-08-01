/** 
 * FileServer class
 * - Takes in a root module's manifest file and
 *   serves all relevant files in the dependency tree
 **/
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var express = require('express');
var router = express.Router();

var FileServer = function(dbg) {
  this.files = {};
  this.manifests = {};
  this.index = null;
  this.debug = null;
  if (typeof dbg == 'undefined') {
    this.debug = false;
  } else {
    this.debug = dbg;
  }
};

FileServer.prototype.serveModule = function(prefix, url) {
  fs.readFile(url, function(err, file) {
    if (err) {
      throw err;
    }
    var filename = path.basename(url);
    var resolvedURL = path.join(prefix, filename);
    var manifest = JSON.parse(file);

    // map Scripts, Statics, Views
    var files = [];
    if (manifest.app && manifest.app.static) files = files.concat(manifest.app.static);
    if (manifest.app && manifest.app.script) files = files.concat(manifest.app.script);
    if (manifest.app && manifest.app.index) files = files.concat(manifest.app.index);
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
      this.files[fileURL] = resolvedFile;
    }.bind(this));

    // map dependencies
    if (manifest.dependencies) {
      for (var dep in manifest.dependencies) {
        var depURL = manifest.dependencies[dep].url;
        var depPrefix = path.join(prefix, dep);
        this.serveModule(depPrefix, path.resolve(path.dirname(url), depURL));
        manifest.dependencies[dep].url =
            path.join(depPrefix, path.basename(depURL));
      }
    }
    this.manifests[resolvedURL] = manifest;
  }.bind(this));
};

// Handle web requests against known files.
FileServer.prototype.route = function(req, res, next) {
  // Remove leading '/'
  if (req.url.length && req.url[0] == '/') {
    req.url = req.url.substr(1);
  }
  // Check if grabbing index
  if ((!req.url || req.url == '') && this.index) {
    // Establish a CSRF Token for the session
    var token = req.csrfToken();
    req.session.customCSRF = token;
    res.cookie('XSRF-TOKEN', token);
    req.url = this.index;
  }
  
  if (this.files[req.url]) {
    fs.readFile(this.files[req.url], {encoding: "binary"}, function(err, file) {
      if (err) {
        console.error('Error reading ' + req.url + ':' + this.files[req.url] + " - " + err);
        this.sendError(res);
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
    this.sendError(res);
  }
};

/** ERROR HANDLING **/
FileServer.prototype.sendError = function(res) {
  console.log("Generating error");
  var err = new Error('Not Found');
  err.status = 404;
  res.status(err.status);
  
  if (this.debug) {
    res.render('error', {
      layout: 'layout',
      message: err.message,
      status: err.status,
      stack: err.stack
    });
  } else {
    res.render('error', {
      layout: 'layout',
      message: err.message,
      status: err.status,
      stack: ''
    });
  }
};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    console.log('Authenticated as ' + req.user);
  res.render('account', { user: req.user });
  /**
    res.render('profile', {
      layout: 'layout',
      user: req.user
    });
  **/
    //next();
  } else {
    console.log("Not authenticated");
  res.render('login', { user: req.user, message: req.session.messages, csrf: req.csrfToken()});
/**
    res.render('login', {
      layout: 'layout',
      csrf: req.csrfToken(),
      message: req.flash('loginMessage')
    });
**/
  }
}

module.exports.serve = function(manifest, debug) {
  var server = new FileServer(debug);
  server.serveModule('./', manifest);
  router.get('*', ensureAuthenticated, server.route.bind(server));
  return router;
};
