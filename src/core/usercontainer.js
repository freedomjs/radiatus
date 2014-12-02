var path = require("path");
var util = require("./util");

var StatusEnum = {
  "OFFLINE": 0,
  "STARTING": 1,
  "ONLINE": 2
};

var BehaviorEnum = {
  "ALWAYS": 0,
  "WHEN_CONNECTED": 1
};

var UserContainer = function(name, manifest, defaultBehavior) {
  this.logger = require("../core/logger").getLogger(path.basename(__filename) + ':' + name);
  this.logger.trace("constructor: enter");

  this._name = name;
  this._manifest = manifest;
  this._module = null;
  this._sockets = [];
  this._status = "OFFLINE";
  if (typeof defaultBehavior !== "undefined" &&
      BehaviorEnum.hasOwnProperty(defaultBehavior)) {
    this._behavior = defaultBehavior;
  } else {
    this._behavior = "ALWAYS";
  }
};

UserContainer.prototype.getStatus = function() {
  return this._status;
};

UserContainer.prototype.addSocket = function(socket) {
  logger.trace("addSocket: enter");

  socket.on("init", function(msg) {
    
    console.log(msg);
  });
/**
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
  **/

};

UserContainer.prototype.getOrCreateFreedom = function(manifest, username) {
  logger.trace("getOrCreateFreedom: enter");
  if (this._fContexts.hasOwnProperty(username)) {
    return this._fContexts[username];
  }
  logger.debug("Initializing freedom.js context for " + username);
  var fContext = freedom.freedom(manifest, {
    debug: false,
  }, function(username, register) {
    register("core.storage", require("./coreproviders/storage.js").bind({}, username));
    register("core.websocket", require("./coreproviders/websocket.js").bind({}, username));
  }.bind(this, username));
  this._fContexts[username] = fContext;
  
  var handler = new Handler(username);
  this._handlers[username] = handler;
    
  var userLogger = require("./logger")(username);
  fContext.on(
    handler.checkLabel.bind(handler),
    handler.processData.bind(handler, userLogger)
  );

  return fContext;
};


function Handler(username) {
  this._username = username;
  this._label = null;
  this._socket = null;
}
Handler.prototype.setSocket = function(socket) {
  this._socket = socket;
};
Handler.prototype.checkLabel = function(label) {
  this._label = label; 
  return true;
}; 
Handler.prototype.processData = function(userLogger, data) {
  if (typeof data == "undefined") {userLogger.debug(this._username+":on:"+this._label);}
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

module.exports.UserContainer = UserContainer;
