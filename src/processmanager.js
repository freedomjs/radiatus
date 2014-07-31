var freedom = require('freedom-for-node');
var cookieParser = require('cookie-parser');

function ProcessManager(sessionStore, cookieParser, cookieKey) {
  this._sockets = {};
  this._fContexts = {};
  this._sessionStore = sessionStore;
  this._cookieParser = cookieParser;
  this._cookieKey = cookieKey;
}

ProcessManager.prototype.onAuthorization = function(handshakeData, accept) {
  /**
  console.log('onAuthorization');
  console.log(handshakeData._query.csrf);
  console.log('------------');
  **/

  if (!(handshakeData && handshakeData._query && handshakeData._query.csrf)) {
    console.error("onAuthorization: missing csrf token");
    accept('MISSING_CSRF', false);
    return;
  }
  
  this._cookieParser(handshakeData, {}, function(err) {
    if (err) {
      console.error("onAuthorization: error parsing cookies");
      accept('COOKIE_PARSE_ERROR', false);
      return;
    }
    var sessionId = handshakeData.signedCookies[this._cookieKey]
    this._sessionStore.load(sessionId, function(err, session) {
      if (err || !session) {
        console.error("onAuthorization: invalid session");
        accept('INVALID_SESSION', false);
        return;
      }
      var token = handshakeData._query.csrf;
      handshakeData.session = session;

      if (session.customCSRF !== token) {
        console.error("onAuthorization: invalid csrf token");
        accept('INVALID_CSRFTOKEN', false);
        return;
      }
      accept(null, true);
    });

  }.bind(this));
};

ProcessManager.prototype.onConnection = function(name, manifest, socket) {
  console.log('onConnection');
  console.log(socket.handshake.headers.cookie);
  console.log('------------');

  //@TODO - replace hardcoded manifest
  var fContext = freedom.freedom(manifest, {
    debug: false
  });
  this._sockets[name] = socket;
  this._fContexts[name] = fContext;
  
  function Handler(socket) {
    this._label = null;
    this._socket = socket;
  }
  Handler.prototype.checkLabel = function(label) {
    this._label = label; 
    return true;
  }; 
  Handler.prototype.processData = function(data) {
    console.log('on:'+this._label+':'+JSON.stringify(data));
    this._socket.emit('message', {
      label: this._label,
      data: data
    });
  };

  var handler = new Handler(socket);
  fContext.on(
    handler.checkLabel.bind(handler),
    handler.processData.bind(handler)
  );

  socket.on('message', function(fContext, msg) {
    console.log('emit:'+msg.label+':'+JSON.stringify(msg.data));
    fContext.emit(msg.label, msg.data);
  }.bind(this, fContext));

  socket.on('disconnect', function() {
    console.log('user disconnected');
  }.bind(this));

};

module.exports.ProcessManager = ProcessManager;
