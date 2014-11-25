(function(exports) {
  //Load socket.io client library
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

    this.config = {
      debug: true
    };
  }

  Freedom.prototype.on = function(label, callback) {
    if (this.config.debug) console.log('register:on:' + label);
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
    if (this.config.debug) console.log('once:' + label);
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

    if (this.config.debug) {
      if(typeof data == 'undefined') {console.log('emit:'+label);}
      else {console.log('emit:'+label+':'+JSON.stringify(data).substr(0, 200));}
    }
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
    if (this.config.debug) {
      if (typeof msg.data == 'undefined') {console.log('on:'+msg.label);}
      else {console.log('on:'+msg.label+':'+JSON.stringify(msg.data).substr(0, 200));}
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

  function init(exports) {
    // Need to wait until socket.io has fully loaded
    if (typeof exports.io == 'undefined' || 
        typeof exports.Cookies == 'undefined') {
      setTimeout(init.bind(this, exports), 0);
      return;
    }
    var csrfToken = exports.Cookies.get('XSRF-TOKEN');
    exports.freedom._onSocket(exports.io('/?csrf='+csrfToken));
    //freedom._onSocket(exports.io());
  }
  var freedom = new Freedom();
  
  // Extract options
  var scripts = document.getElementsByTagName('script');
  for (var i=0; i<scripts.length; i++) {
    if (scripts[i].src.indexOf('freedom.js') >= 0) {
      var txt = scripts[i].innerText;
      try {
        var parsedTxt = JSON.parse(txt);
        freedom.config = parsedTxt;
      } catch (e) {
        //console.error(e);
      }
    }
  }

  exports.freedom = freedom;
  loadScript('/radiatus/public/bower_components/cookies-js/dist/cookies.min.js');
  loadScript('/socket.io/socket.io.js');
  init(exports);
})(window);
