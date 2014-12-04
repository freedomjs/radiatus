var freedom = require("freedom-for-node");
var path = require("path");
var fs = require("fs");
var User = require("../models/user");
var UserContainer = require("./usercontainer").UserContainer;
var logger = require("./logger").getLogger(path.basename(__filename));

function ProcessManager(manifest) {
  "use strict";
  logger.trace("constructor: enter");
  this._defaultManifest = manifest;
  this._userContainers = {};
  this._serviceUsers = {};

  this._init();
}

ProcessManager.prototype.getOrCreateUser = function(username) {
  "use strict";
  if (!this._userContainers.hasOwnProperty(username)) {
    logger.trace('getOrCreateUser: creating user container ' + username);
    this._userContainers[username] = new UserContainer(username, this._defaultManifest);
  }
  return this._userContainers[username];
};

ProcessManager.prototype.getServiceUser = function(name) {
  "use strict";
  return this._serviceUsers[name];
};

ProcessManager.prototype.addSocket = function(username, socket) {
  "use strict";
  logger.trace('addSocket: username=' + username);
  var container = this.getOrCreateUser(username);
  container.addSocket(socket);
};

// Currently no ability to suspend and wake on message
// All containers must be up at all times
ProcessManager.prototype._init = function() {
  "use strict";
  logger.trace("_init: enter");
  // Create all user containers
  User.find({}, function(err, docs) {
    for (var i=0; i<docs.length; i++) {
      var u = docs[i];
      this.getOrCreateUser(u.username);
      logger.trace('_init: creating user container=' + u.username);
    }
  }.bind(this));

  // Initialize service users
  fs.readFile(this._defaultManifest, function(err, file) {
    if (err) { throw err; }
    var manifest = JSON.parse(file);
    if (manifest.services) {
      for (var k in manifest.services) {
        if (manifest.services.hasOwnProperty(k)) {
          var service = manifest.services[k];
          if (service.username && service.url) {
            var servicePath = path.resolve(path.dirname(this._defaultManifest), service.url);
            this._serviceUsers[service.username] = new UserContainer(service.username, servicePath);
            logger.trace('_init: creating service user=' + service.username);
          } else {
            logger.error("_init: failed to create service "+k+
              ", missing username or url in manifest");
          }
        }
      }
    }
  }.bind(this)); 
};

var processManager;
module.exports.initialize = function(manifest) {
  "use strict";
  if (typeof processManager !== "undefined") {
    return processManager;
  }
  processManager = new ProcessManager(manifest);
  module.exports.singleton = processManager;
  return processManager;
};
module.exports.ProcessManager = ProcessManager;
