(function(exports) {
  //Load socket.io client library
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '/socket.io/socket.io.js';
  var topScript = document.getElementsByTagName('script')[0];
  topScript.parentNode.insertBefore(script, topScript);

  function Freedom(socket) {
    this.socket = socket;
    this.onCallbacks = {};
    this.onceCallbacks = {};

    this.socket.on('message', this._onMessage.bind(this));
  }
  
  Freedom.prototype.on = function(label, callback) {
    console.log('on:' + label);
    if (!this.onCallbacks.hasOwnProperty(label)) {
      this.onCallbacks[label] = [];
    }
    this.onCallbacks[label].push(callback);
  };

  Freedom.prototype.once = function(label, callback) {
    console.log('once:' + label);
    if (!this.onceCallbacks.hasOwnProperty(label)) {
      this.onceCallbacks[label] = [];
    }
    this.onceCallbacks[label].push(callback);
  };

  Freedom.prototype.emit = function(label, data) {
    console.log('emit:'+label+':'+data);
    this.socket.emit('message', {
      label: label,
      data: data
    });
  };

  Freedom.prototype._onMessage = function(msg) {
    var label = msg.label;
    if (this.onCallbacks.hasOwnProperty(label)) {
      var callbacks = this.onCallbacks[label];
      for (var i=0; i<callbacks.length; i++) {
        callbacks[i](msg.data);
      }
    }
    if (this.onceCallbacks.hasOwnProperty(label)) {
      var callbacks = this.onceCallbacks[label];
      for (var i=0; i<callbacks.length; i++) {
        callbacks[i](msg.data);
      }
      this.onceCallbacks[label] = [];
    }
  };

  function init(exports) {
    var freedom = {};
    var socket = null;

    // Need to wait until socket.io has fully loaded
    if (typeof exports.io == 'undefined') {
      setTimeout(init.bind(this, exports), 0);
      return;
    }

    socket = exports.io();
    exports.freedom = new Freedom(socket);
  };
  init(exports);
})(window);
