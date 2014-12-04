/*jshint browser:true*/

var EventInterface = require("freedom/src/proxy/eventInterface");
var ApiInterface = require("freedom/src/proxy/apiInterface");
var Consumer = require("freedom/src/consumer");

var DEBUG = true;

var Stub = function(config, socket) {
  "use strict";
  this._config = config;
  this._socket = socket;

  this._initialize();
  
  // Old
  this._onCallbacks = {};
  this._onceCallbacks = {};
  this._queue = [];
};

Stub.prototype._initialize = function() {
  "use strict";
  if (this._config.type === "api") {
    this._setupApiInterface();
  } else if (this._config.type === "event") {
    this._setupEventInterface();
  } else {
    console.error("Invalid configuration from server");
  }
};

Stub.prototype._setupApiInterface = function() {
  "use strict";
  var interfaceCls = ApiInterface.bind({}, this._config.api);
  var c = new Consumer(interfaceCls, console);
  c.onMessage("control", { channel: "default", name: "default", reverse: "default" });
  c.on("default", function(msg) {
    console.log('out: ' + JSON.stringify(msg));
  });
  window.temp = c;
};

Stub.prototype._setupEventInterface = function() {
  "use strict";
};

Stub.prototype.on = function(label, callback) {
  "use strict";
  if (DEBUG) { console.log('register:on:' + label); }
  if (!this._onCallbacks.hasOwnProperty(label)) {
    this._onCallbacks[label] = [];
  }
  this._onCallbacks[label].push(callback);
  /**
  this._onCallbacks[label].push(function(data) {
    console.log(data);
  });
  **/
};

Stub.prototype.once = function(label, callback) {
  "use strict";
  if (DEBUG) { console.log('once:' + label); }
  if (!this._onceCallbacks.hasOwnProperty(label)) {
    this._onceCallbacks[label] = [];
  }
  this._onceCallbacks[label].push(callback);
};

Stub.prototype.emit = function(label, data) {
  "use strict";
  if (this._socket === null) {
    this._pushQueue('emit', label, data);
    return;
  }

  if (DEBUG) {
    if (typeof data === 'undefined') { console.log('emit:'+label); }
    else { console.log('emit:'+label+':'+JSON.stringify(data).substr(0, 200)); }
  }
  this._socket.emit('message', {
    label: label,
    data: data
  });
};

Stub.prototype.setSocket= function(socket) {
  "use strict";
  this._socket = socket;
  this._socket.on('message', this._onMessage.bind(this));
  this._flushQueue();
};

Stub.prototype._pushQueue = function(method, label, payload) {
  "use strict";
  this._queue.push({
    label: label,
    data: payload
  });
};

Stub.prototype._flushQueue = function() {
  "use strict";
  for (var i=0; i<this._queue.length; i++) {
    var action = this._queue[i];
    this.emit(action.label, action.data);
  }
  this._queue = [];
};

Stub.prototype._onMessage = function(msg) {
  "use strict";
  var i, callbacks;
  var label = msg.label;
  if (DEBUG) {
    if (typeof msg.data === 'undefined') { console.log('on:'+msg.label); }
    else { console.log('on:'+msg.label+':'+JSON.stringify(msg.data).substr(0, 200)); }
  }
  
  if (this._onCallbacks.hasOwnProperty(label)) {
    callbacks = this._onCallbacks[label];
    for (i=0; i<callbacks.length; i++) {
      callbacks[i](msg.data);
    }
  }
  if (this._onceCallbacks.hasOwnProperty(label)) {
    callbacks = this._onceCallbacks[label];
    for (i=0; i<callbacks.length; i++) {
      callbacks[i](msg.data);
    }
    this._onceCallbacks[label] = [];
  }
};

module.exports.Stub = Stub;
