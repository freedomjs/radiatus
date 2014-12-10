var path = require("path");
var Q = require("q");
var fs = require("fs");
var freedom = require("freedom-for-node");
var util = require("./util");
var EventInterface = require("freedom/src/proxy/eventInterface");
var Provider = require("freedom/src/provider");
var Consumer = require("freedom/src/consumer");

/**
 * Class that manages the user container for a single user or service user
 * @constructor
 * @param {String} name - username or name of service user
 * @param {String} manifest - URI to manifest of freedom.js module to run
 **/
var UserContainer = function(name, manifest) {
  "use strict";
  this.logger = require("../core/logger").getLogger(path.basename(__filename) + ":" + name);
  this.logger.trace("constructor: enter");

  this._name = name;
  this._manifest = manifest;
  this._sockets = [];
  this._manifestJson = null;
  this._module = null; // this._module.close() / this._module.close(instance)
  this._initialize();
};

/**
 * Handle an incoming socket from socket.io
 * @method
 * @param {socket} socket - new socket.io connection
 **/
UserContainer.prototype.addSocket = function(socket) {
  "use strict";
  this.logger.trace("addSocket: enter");
  this._sockets.push(socket);
  
  // Make sure that the module exists
  this._initialize().then(function(socket) {
    // Respond to first 'init' message with a description of the interface
    // Create the respective Provider/Consumer
    socket.once("init", function(socket, msg) {
      var p;
      this.logger.trace("socket: init," + JSON.stringify(msg));
      if (this._manifestJson.hasOwnProperty("default") && 
          this._manifestJson.hasOwnProperty("provides") &&
          this._manifestJson.hasOwnProperty("api") &&
          this._manifestJson.provides.indexOf(this._manifestJson.default) >= 0 &&
          this._manifestJson.api.hasOwnProperty(this._manifestJson.default)) {
        // Try an apiInterface
        socket.emit("init", { type: "api", api: this._manifestJson.api[this._manifestJson.default] });
        p = new Provider(this._manifestJson.api[this._manifestJson.default], this.logger);
        p.onMessage('control', {channel: 'default', name: 'default', reverse: 'default'});
        p.getInterface().providePromises(function(module, dispatchEvent){
          var args = Array.prototype.slice.call(arguments, 2);
          var instance = module.apply({}, args);
          if (instance.on) {
            instance.on(function(dispatchEvent, tag, msg) {
              dispatchEvent(tag, msg);
              return false;
            }.bind({}, dispatchEvent));
          }
          return instance;
        }.bind({}, this._module));
      } else {
        // Force an eventInterface
        socket.emit("init", { type: "event" });
        p = new Consumer(EventInterface.bind({}), this.logger);
        p.onMessage('control', {channel: 'default', name: 'default', reverse: 'default'});
        //p.getInterface() on both sides
        var Proxy = p.getProxyInterface();
        var proxy = new Proxy();
        var instance = this._module();
        proxy.on(function(instance, tag, data) {
          this.logger.debug("proxy: " + tag + "," + data);
          instance.emit(tag, data);
          return false;
        }.bind(this, instance));
        instance.on(function(proxy, tag, data) {
          this.logger.debug("instance: " + tag + "," + data);
          proxy.emit(tag, data);
          return false;
        }.bind(this, proxy));
      }
      p.on('default', function(socket, msg) {
        this.logger.debug("provider: default," + JSON.stringify(msg));
        socket.emit('default', msg);
      }.bind(this, socket));
      socket.on('default', function(p, msg) {
        this.logger.debug("socket: default," + JSON.stringify(msg));
        p.onMessage('default', msg);
      }.bind(this, p));
    }.bind(this, socket));

  }.bind(this, socket));

};

/**
 * Initialize the user container.
 * Read and parse the JSON from the manifest and 
 * start the freedom.js module
 * @private
 * @return {Promise} - fulfills when freedom.js module is loaded
 **/
UserContainer.prototype._initialize = function() {
  "use strict";
  this.logger.trace("_initialize: enter");
  
  var deferred = Q.defer();

  if (this._manifestJson === null) {
    fs.readFile(this._manifest, function(err, file) {
      if (err) { throw err; }
      this._manifestJson = JSON.parse(file);
    }.bind(this));
  }

  if (this._module === null) {
    this.logger.trace("_initialize: Initializing freedom.js root module");
    freedom.freedom(this._manifest, {
    }).then(function(deferred, module) {
      this.logger.debug("_initialize: freedom.js module created");
      this._module = module;
      deferred.resolve();
    }.bind(this, deferred));
    //register("core.storage", require("./coreproviders/storage.js").bind({}, username));
    //register("core.websocket", require("./coreproviders/websocket.js").bind({}, username));
  } else {
    deferred.resolve();
  }
  return deferred.promise;
};

/**
 * Destroys the freedom.js module
 * @private
 **/
UserContainer.prototype._teardown = function() {
  "use strict";
  this.logger.trace("_teardown: enter");
  if (this._module === null) {
    this.logger.warn("_teardown: module already destroyed");
    return;
  }

  this._module.close();
  this._module = null;
};

/**
  var handler = new Handler(username);
  this._handlers[username] = handler;
    
  var userLogger = require("./logger")(username);
  fContext.on(
    handler.checkLabel.bind(handler),
    handler.processData.bind(handler, userLogger)
  );

  var fContext = this.getOrCreateFreedom(this._rootManifestPath, username);
  this._handlers[username].setSocket(socket);
  logger.debug("onConnection: connected user="+username);
  
  var userLogger = require("./logger")(username);
  socket.on("message", function(username, fContext, userLogger, msg) {
    if (typeof msg.data == "undefined") {userLogger.debug(username+":emit:"+msg.label);}
    else {userLogger.debug(username+":emit:"+msg.label+":"+JSON.stringify(msg.data).substr(0, 200));}
    // Need to place any instances of node.js Buffers
    var newData = util.replaceBuffers(msg.data);
    fContext.emit(msg.label, newData);
  }.bind(this, username, fContext, userLogger));

  socket.on("disconnect", function(username) {
    this._handlers[username].setSocket(null);
    logger.debug(username+":disconnected");
  }.bind(this, username));

function Handler(username) {
  "use strict";
  this._username = username;
  this._label = null;
  this._socket = null;
}
Handler.prototype.setSocket = function(socket) {
  "use strict";
  this._socket = socket;
};
Handler.prototype.checkLabel = function(label) {
  "use strict";
  this._label = label; 
  return true;
}; 
Handler.prototype.processData = function(userLogger, data) {
  "use strict";
  if (typeof data === "undefined") { userLogger.debug(this._username+":on:"+this._label); }
  else {userLogger.debug(this._username+":on:"+this._label+":"+JSON.stringify(data).substr(0, 100));}

  if (this._socket !== null) {
    this._socket.emit("message", {
      label: this._label,
      data: data
    });
  } else {
    userLogger.warn(this._username+":on:"+this._label+":message dropped, no socket");
  }
};
**/

module.exports.UserContainer = UserContainer;
