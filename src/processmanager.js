var freedom = require('freedom-for-node');
var cookieParser = require('cookie-parser');
var path = require('path');
var fs = require('fs');
var User = require('./models/user');
var logger = require('./logger')('src/processmanager.js');

function ProcessManager(manifest, sessionStore, cookieParser, cookieKey) {
  logger.trace('constructor: enter');
  this._handlers = {};
  this._fContexts = {};

  this._rootManifestPath = manifest;
  this._sessionStore = sessionStore;
  this._cookieParser = cookieParser;
  this._cookieKey = cookieKey;
  this.init();
}

// Currently no ability to suspend and wake on message
// All containers must be up at all times
ProcessManager.prototype.init = function() {
  logger.trace('init: enter')
  User.find({}, function(err, docs) {
    for (var i=0; i<docs.length; i++) {
      var u = docs[i];
      this.getOrCreateFreedom(this._rootManifestPath, u.username);
    }
  }.bind(this));

  fs.readFile(this._rootManifestPath, function(err, file) {
    if (err) throw err;
    var manifest = JSON.parse(file);
    if (manifest.services) {
      for (var k in manifest.services) {
        if (manifest.services.hasOwnProperty(k)) {
          var service = manifest.services[k];
          if (service.username && service.url) {
            var servicePath = path.resolve(path.dirname(this._rootManifestPath), service.url);
            this.getOrCreateFreedom(servicePath, service.username);
          } else {
            logger.error('init: failed to create service '+k+
              ', missing username or url in manifest');
          }
        }
      }
    }
  }.bind(this)); 
};

ProcessManager.prototype.getOrCreateFreedom = function(manifest, username) {
  logger.trace('getOrCreateFreedom: enter');
  if (this._fContexts.hasOwnProperty(username)) {
    return this._fContexts[username];
  }
  logger.debug("Initializing freedom.js context for " + username);
  var fContext = freedom.freedom(manifest, {
    debug: false,
  }, function(register) {
    register('core.storage', require('./coreproviders/storage.js').bind({}, username));
    register('core.websocket', require('./coreproviders/websocket.js').bind({}, username));
  });
  this._fContexts[username] = fContext;
  
  var handler = new Handler(username);
  this._handlers[username] = handler;
    
  var userLogger = require('./logger')(username);
  fContext.on(
    handler.checkLabel.bind(handler),
    handler.processData.bind(handler, userLogger)
  );

  return fContext;
};

ProcessManager.prototype.onAuthorization = function(handshakeData, accept) {
  logger.trace('onAuthorization: enter');

  if (!(handshakeData && handshakeData._query && handshakeData._query.csrf)) {
    logger.warn("onAuthorization: missing csrf token");
    accept('MISSING_CSRF', false);
    return;
  }
  
  this._cookieParser(handshakeData, {}, function(err) {
    if (err) {
      logger.warn("onAuthorization: error parsing cookies");
      accept('COOKIE_PARSE_ERROR', false);
      return;
    }
    var sessionId = handshakeData.signedCookies[this._cookieKey]
    this._sessionStore.load(sessionId, function(err, session) {
      if (err || !session) {
        logger.warn("onAuthorization: invalid session");
        accept('INVALID_SESSION', false);
        return;
      }
      var token = handshakeData._query.csrf;
      handshakeData.session = session;

      if (session.customCSRF !== token) {
        logger.warn("onAuthorization: invalid csrf token");
        accept('INVALID_CSRFTOKEN', false);
        return;
      }

      logger.trace('onAuthorization: valid session, continuing');
      accept(null, true);
    });

  }.bind(this));
};

ProcessManager.prototype.onConnection = function(socket) {
  logger.trace('onConnection: enter');
  /**
  console.log(socket.conn.request.session);
  console.log(socket.handshake.headers.cookie);
  **/

  if (!socket.conn || !socket.conn.request ||
      !socket.conn.request.session ||
      !socket.conn.request.session.passport ||
      !socket.conn.request.session.passport.user) {
    logger.warn('onConnection: unrecognized user');
    return;
  } 
  
  var id = socket.conn.request.session.passport.user;
  User.findById(id, function(socket, err, user) {
    if (err) {
      logger.warn('onConnection: error finding user');
      logger.warn(err);
      return;
    }

    var username = user.username;
    var fContext = this.getOrCreateFreedom(this._rootManifestPath, username);
    this._handlers[username].setSocket(socket);
    logger.debug('onConnection: connected user='+username);
    
    var userLogger = require('./logger')(username);
    socket.on('message', function(username, fContext, userLogger, msg) {
      if (typeof msg.data == 'undefined') {userLogger.debug(username+':emit:'+msg.label);}
      else {userLogger.debug(username+':emit:'+msg.label+':'+JSON.stringify(msg.data).substr(0, 200));}
      // Need to place any instances of node.js Buffers
      var newData = replaceBuffers(msg.data);
      fContext.emit(msg.label, newData);
    }.bind(this, username, fContext, userLogger));

    socket.on('disconnect', function(username) {
      this._handlers[username].setSocket(null);
      logger.debug(username+':disconnected');
    }.bind(this, username));

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
Handler.prototype.processData = function(userLogger, data) {
  if (typeof data == 'undefined') {userLogger.debug(this._username+':on:'+this._label);}
  else {userLogger.debug(this._username+':on:'+this._label+':'+JSON.stringify(data).substr(0, 100));}

  if (this._socket !== null) {
    this._socket.emit('message', {
      label: this._label,
      data: data
    });
  } else {
    userLogger.warn(this._username+':on:'+this._label+':message dropped, no socket');
  }
};

// Socket.io replaces all ArrayBuffers with node.js Buffer objects
// Convert them back before sending to freedom
function replaceBuffers(data) {
  if (data instanceof Buffer) {
    return new Uint8Array(data).buffer;
  } else if (Array.isArray(data)) {
    return data.map(replaceBuffers);
  } else if (typeof data == 'object') {
    for (var k in data) {
      if (data.hasOwnProperty(k)) {
        data[k] = replaceBuffers(data[k]);
      }
    }
    Object.keys(data).forEach(function(data, elt) {
      data[elt] = replaceBuffers(data[elt]);
    }.bind({}, data));
    return data;
  } else {
    return data;
  }
}

module.exports.ProcessManager = ProcessManager;
