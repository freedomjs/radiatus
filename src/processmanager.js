var freedom = require('freedom-for-node');
var cookieParser = require('cookie-parser');
var User = require('./models/user');

function ProcessManager(manifest, sessionStore, cookieParser, cookieKey) {
  this._handlers = {};
  this._fContexts = {};

  this._manifest = manifest;
  this._sessionStore = sessionStore;
  this._cookieParser = cookieParser;
  this._cookieKey = cookieKey;
  this.init();
}

ProcessManager.prototype.init = function() {
  User.find({}, function(err, docs) {
    for (var i=0; i<docs.length; i++) {
      var u = docs[i];
      //this.getOrCreateFreedom(u.username);
    }
  }.bind(this))
};

ProcessManager.prototype.getOrCreateFreedom = function(username) {
  if (this._fContexts.hasOwnProperty(username)) {
    return this._fContexts[username];
  }
  console.log("Creating freedom.js module for " + username);
  var fContext = freedom.freedom(this._manifest, {
    debug: false,
  }, function(register) {
    register('core.storage', require('./coreproviders/storage.js').bind({}, username));
    register('core.websocket', require('./coreproviders/websocket.js').bind({}, username));
  });
  this._fContexts[username] = fContext;
  
  var handler = new Handler(username);
  this._handlers[username] = handler;
    
  fContext.on(
    handler.checkLabel.bind(handler),
    handler.processData.bind(handler)
  );

  return fContext;
};

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

ProcessManager.prototype.onConnection = function(socket) {
  /**
  console.log('onConnection');
  console.log(socket.conn.request.session);
  console.log(socket.handshake.headers.cookie);
  console.log('------------');
  **/

  if (!socket.conn || !socket.conn.request ||
      !socket.conn.request.session ||
      !socket.conn.request.session.passport ||
      !socket.conn.request.session.passport.user) {
    console.error('onConnection: unrecognized user');
    return;
  } 
  
  var id = socket.conn.request.session.passport.user;
  User.findById(id, function(socket, err, user) {
    if (err) {
      console.error('onConnection: '+err);
      return;
    }

    var username = user.username;
    var fContext = this.getOrCreateFreedom(username);
    this._handlers[username].setSocket(socket);
    
    socket.on('message', function(username, fContext, msg) {
      if (typeof msg.data == 'undefined') {console.log(username+':emit:'+msg.label);}
      else {console.log(username+':emit:'+msg.label+':'+JSON.stringify(msg.data).substr(0, 100));}
      fContext.emit(msg.label, msg.data);
    }.bind(this, username, fContext));

    socket.on('disconnect', function() {
      console.log('user disconnected');
    }.bind(this));

  }.bind(this, socket));
  
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
Handler.prototype.processData = function(data) {
  if (typeof data == 'undefined') {console.log(this._username+':on:'+this._label);}
  else {console.log(this._username+':on:'+this._label+':'+JSON.stringify(data).substr(0, 100));}
  this._socket.emit('message', {
    label: this._label,
    data: data
  });
};


module.exports.ProcessManager = ProcessManager;
