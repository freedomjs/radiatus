(function(exports) {
  //Load socket.io client library
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '/socket.io/socket.io.js';
  var topScript = document.getElementsByTagName('script')[0];
  topScript.parentNode.insertBefore(script, topScript);

  function Freedom() {
    this._socket = null;
    this._onCallbacks = {};
    this._onceCallbacks = {};
    this._queue = [];
  }

  Freedom.prototype.on = function(label, callback) {
    if (this._socket == null) {
      this._pushQueue('on', label, callback);
    }

    console.log('on:' + label);
    if (!this._onCallbacks.hasOwnProperty(label)) {
      this._onCallbacks[label] = [];
    }
    this._onCallbacks[label].push(callback);
  };

  Freedom.prototype.once = function(label, callback) {
    if (this._socket == null) {
      this._pushQueue('once', label, callback);
    }

    console.log('once:' + label);
    if (!this._onceCallbacks.hasOwnProperty(label)) {
      this._onceCallbacks[label] = [];
    }
    this._onceCallbacks[label].push(callback);
  };

  Freedom.prototype.emit = function(label, data) {
    if (this._socket == null) {
      this._pushQueue('emit', label, data);
    }

    console.log('emit:'+label+':'+data);
    this._socket.emit('message', {
      label: label,
      data: data
    });
  };
  
  Freedom.prototype._onSocket = function(socket) {
    this._socket = socket;
    this._socket.on('message', this._onMessage.bind(this));
    this._flushQueue();
  };

  Freedom.prototype._pushQueue = function(method, label, payload) {
    this._queue.push({
      method: method,
      args: [label, payload]
    });
  };

  Freedom.prototype._flushQueue = function() {
    for (var i=0; i<this._queue.length; i++) {
      var action = this._queue[i];
      this[action.method].apply(null, action.args);
    }
    this._queue = [];
  };

  Freedom.prototype._onMessage = function(msg) {
    var label = msg.label;
    if (this._onCallbacks.hasOwnProperty(label)) {
      var callbacks = this._onCallbacks[label];
      for (var i=0; i<callbacks.length; i++) {
        callbacks[i](msg.data);
      }
    }
    if (this._onceCallbacks.hasOwnProperty(label)) {
      var callbacks = this._onceCallbacks[label];
      for (var i=0; i<callbacks.length; i++) {
        callbacks[i](msg.data);
      }
      this._onceCallbacks[label] = [];
    }
  };

  function init(exports) {
    var freedom = new Freedom();
    exports.freedom = freedom;

    // Need to wait until socket.io has fully loaded
    if (typeof exports.io == 'undefined') {
      setTimeout(init.bind(this, exports), 0);
      return;
    }
    freedom._onSocket(exports.io());
  };
  init(exports);
})(window);
