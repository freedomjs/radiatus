var path = require("path");
var Q = require("q");
var fs = require("fs");
var util = require("./util");
var Provider = require("freedom/src/provider");
var Consumer = require("freedom/src/consumer");

var UserContainer = function(name, manifest) {
  this.logger = require("../core/logger").getLogger(path.basename(__filename) + ":" + name);
  this.logger.trace("constructor: enter");

  this._name = name;
  this._manifest = manifest;
  this._sockets = [];
  if (typeof defaultBehavior !== "undefined" &&
      BehaviorEnum.hasOwnProperty(defaultBehavior)) {
    this._behavior = defaultBehavior;
  } else {
    this._behavior = "ALWAYS";
  }
  this._manifestJson = null;
  this._moduleConstructor = null;
  this._initialize();
};

UserContainer.prototype.getStatus = function() {
  return this._status;
};

UserContainer.prototype.addSocket = function(socket) {
  this.logger.trace("addSocket: enter");
  this._sockets.push(socket);
  socket.on("init", function(msg) {
    
    console.log(msg);
  });
/**
 * 
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
  **/

};

UserContainer.prototype._initialize = function() {
  this.logger.trace("_initialize: enter");
  if (this._manifestJson === null) {
    fs.readFile(this._manifest, function(err, file) {
      if (err) throw err;
      this._manifestJson = JSON.parse(file);
    }.bind(this));
  }

  if (this._moduleConstructor === null) {
    this.logger.debug("_startModule: Initializing freedom.js root module");
    freedom.freedom(this._manifest, {
    }, function(constructor) {
      this.logger.debug("_startModule: freedom.js module created");
      this._moduleConstructor = constructor;
    }.bind(this));
    //register("core.storage", require("./coreproviders/storage.js").bind({}, username));
    //register("core.websocket", require("./coreproviders/websocket.js").bind({}, username));
  }
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
