var fs = require('fs');
var path = require('path');
var mime = require('mime');

var fileServer = function() {
  this.files = {};
  this.manifests = {};
  this.index = null;
};

fileServer.prototype.serveModule = function(prefix, url) {
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
fileServer.prototype.route = function(req, response) {
  if (req.params[0].length && req.params[0][0] == '/') {
    req.params[0] = req.params[0].substr(1);
  }
  if (!req.params[0] && this.index) {
    req.params[0] = this.index;
  }

  if (this.files[req.params[0]]) {
    fs.readFile(this.files[req.params[0]], {encoding: "binary"}, function(err, file) {
      if (err) {
        response.writeHead(404);
        console.warn(err);
        return response.end(err.code);
      }
      response.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': mime.lookup(this.files[req.params[0]])
      });
      response.write(file, "binary");
      response.end();
    }.bind(this));
  }
  else if (this.manifests[req.params[0]]) {
    var data = JSON.stringify(this.manifests[req.params[0]]);
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
  var server = new fileServer();
  server.serveModule('./', manifest);
  return server;
};