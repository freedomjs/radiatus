/*jshint browser:true */
/*global Promise */
(function(exports) {
  "use strict";
  var DEBUG = true;
  //Load JavaScript libraries
  function loadScript(url) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    var topScript = document.getElementsByTagName('script')[0];
    topScript.parentNode.insertBefore(script, topScript);
  }

  function Freedom() {
    this._socket = null;
    this._onCallbacks = {};
    this._onceCallbacks = {};
    this._queue = [];
  }

  Freedom.prototype.on = function(label, callback) {
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

  Freedom.prototype.once = function(label, callback) {
    if (DEBUG) { console.log('once:' + label); }
    if (!this._onceCallbacks.hasOwnProperty(label)) {
      this._onceCallbacks[label] = [];
    }
    this._onceCallbacks[label].push(callback);
  };

  Freedom.prototype.emit = function(label, data) {
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
  
  Freedom.prototype.setSocket= function(socket) {
    this._socket = socket;
    this._socket.on('message', this._onMessage.bind(this));
    this._flushQueue();
  };

  Freedom.prototype._pushQueue = function(method, label, payload) {
    this._queue.push({
      label: label,
      data: payload
    });
  };

  Freedom.prototype._flushQueue = function() {
    for (var i=0; i<this._queue.length; i++) {
      var action = this._queue[i];
      this.emit(action.label, action.data);
    }
    this._queue = [];
  };

  Freedom.prototype._onMessage = function(msg) {
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

  /**
   * Initialization code for the client stub.
   * This will get retried every 10ms until the dependencies
   * are loaded or the retry limit is reached.
   *
   * @param {Object} exports - global (usually window)
   * @param {String} manifest - path to the manifest of the root freedom.js module
   * @param {Object} options - freedom.js options
   * @param {Function} resolve - function to call to resolve the freedom Promise
   * @param {Function} reject - function to call to reject the freedom Promise
   * @param {Number} retries - number of retries left for init
   **/
  function init(exports, manifest, options, resolve, reject, retries) {
    // Need to wait until dependencies have fully loaded
    if (typeof exports.io === "undefined" || 
        typeof exports.Cookies === "undefined" ||
        typeof exports.Promise === "undefined") {
      if (retries > 0) {
        setTimeout(init.bind({}, exports, manifest, options, resolve, reject, (retries-1)), 10);
      } else {
        console.error("freedom.js: Error importing dependencies");
      }
      return;
    }
    if (DEBUG) { console.log('freedom.js: Initializing connection to server'); }
    // Create socket to the server
    var csrfToken = exports.Cookies.get('XSRF-TOKEN');
    var socket = exports.io("/?csrf=" + csrfToken);
    // Get initialization information from the server
    socket.on("init", function(resolve, reject, msg) {
      if (DEBUG) { console.log(msg); }
    }.bind({}, resolve, reject));
    socket.emit("init", {
      manifest: manifest,
      options: options
    });
  }
  
  // Dynamically load dependencies
  loadScript("/radiatus/public/bower_components/cookies-js/dist/cookies.min.js");
  loadScript("/socket.io/socket.io.js");
  if (typeof exports.Promise === "undefined") {
    loadScript("/radiatus/public/bower_components/es6-promise-polyfill/promise.js");
  }
  // Match the freedom.js external interface
  exports.freedom = function(manifest, options) {
    return new Promise(function(manifest, options, resolve, reject) {
      init(exports, manifest, options, resolve, reject, 100);
    }.bind({}, manifest, options));
  };
})(window);
