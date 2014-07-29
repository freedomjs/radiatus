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

var FileServer = function() {
  this.files = {};
  this.manifests = {};
  this.index = null;
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
FileServer.prototype.route = function(req, response) {
  // Remove leading '/'
  if (req.url.length && req.url[0] == '/') {
    req.url = req.url.substr(1);
  }
  // Check if grabbing index
  if ((!req.url || req.url == '') && this.index) {
    req.url = this.index;
  }
  
  console.log(this.files);
  console.log(req.url);
  if (this.files[req.url]) {
    fs.readFile(this.files[req.url], {encoding: "binary"}, function(err, file) {
      if (err) {
        response.writeHead(404);
        return response.end(err.code);
      }
      response.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': mime.lookup(this.files[req.url])
      });
      response.write(file, "binary");
      response.end();
    }.bind(this));
  }
  else if (this.manifests[req.url]) {
    var data = JSON.stringify(this.manifests[req.url]);
    response.writeHead(200, {
      'Content-Length': data.length,
      'Content-Type': 'application/json'
    });
    response.write(data);
    response.end();
  }
  else {
    response.writeHead(404);
    response.end("404: Not Found");
  }
};

exports.serve = function(manifest) {
  var server = new FileServer();
  server.serveModule('./', manifest);
  router.get('*', server.route.bind(server));
  return router;
};
