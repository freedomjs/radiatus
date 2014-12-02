var freedom = require("freedom-for-node");
var path = require("path");
var fs = require("fs");
var User = require("../models/user");
var UserContainer = require("./usercontainer").UserContainer;
var logger = require("./logger").getLogger(path.basename(__filename));

function ProcessManager(manifest) {
  logger.trace("constructor: enter");
  this._defaultManifest = manifest;
  this._userContainers = {};
  this._serviceUsers = {};

  this._init();
}

ProcessManager.prototype.getOrCreateUser = function(username) {
  if (!this._userContainers.hasOwnProperty(username)) {
    this._userContainers[username] = new UserContainer(username, this._defaultManifest, "ALWAYS");
  }

  return this._userContainers[username];
};

ProcessManager.prototype.getServiceUser = function(name) {
  return this._serviceUsers[name];
};

ProcessManager.prototype.addSocket = function(username, socket) {
  var container = this.getOrCreateUser(username);
  container.addSocket(socket);
};

// Currently no ability to suspend and wake on message
// All containers must be up at all times
ProcessManager.prototype._init = function() {
  logger.trace("_init: enter");
  // Create all user containers
  User.find({}, function(err, docs) {
    for (var i=0; i<docs.length; i++) {
      var u = docs[i];
      this.getOrCreateUser(u.username);
    }
  }.bind(this));

  // Initialize service users
  fs.readFile(this._defaultManifest, function(err, file) {
    if (err) throw err;
    var manifest = JSON.parse(file);
    if (manifest.services) {
      for (var k in manifest.services) {
        if (manifest.services.hasOwnProperty(k)) {
          var service = manifest.services[k];
          if (service.username && service.url) {
            var servicePath = path.resolve(path.dirname(this._defaultManifest), service.url);
            this._serviceUsers[service.username] = new UserContainer(service.username, servicePath, "ALWAYS");
          } else {
            logger.error("init: failed to create service "+k+
              ", missing username or url in manifest");
          }
        }
      }
    }
  }.bind(this)); 
};

var processManager;
module.exports.initialize = function(manifest) {
  if (typeof processManager !== "undefined") {
    return processManager;
  }
  processManager = new ProcessManager(manifest);
  module.exports.singleton = processManager;
  return processManager;
};
module.exports.ProcessManager = ProcessManager;
