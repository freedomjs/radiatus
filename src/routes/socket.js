var path = require("path");
var logger = require("../core/logger")(path.basename(__filename));

var SocketHandler = function(sessionStore, cookieParser, cookieKey) {
  this._sessionStore = sessionStore;
  this._cookieParser = cookieParser;
  this._cookieKey = cookieKey;
};

SocketHandler.prototype.onAuthorization = function(handshakeData, accept) {
  logger.trace('onAuthorization: enter');

  if (!(handshakeData && handshakeData._query && handshakeData._query.csrf)) {
    logger.warn("onAuthorization: missing csrf token");
    accept('MISSING_CSRF', false);
    return;
  }
  
  this._cookieParser(handshakeData, {}, function(handshakeData, accept, err) {
    if (err) {
      logger.warn("onAuthorization: error parsing cookies");
      accept('COOKIE_PARSE_ERROR', false);
      return;
    }
    var sessionId = handshakeData.signedCookies[this._cookieKey];
    this._sessionStore.load(sessionId, function(handshakeData, accept, err, session) {
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
    }.bind(this, handshakeData, accept));

  }.bind(this, handshakeData, accept));
};

SocketHandler.prototype.onConnection = function(socket) {
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
  /**
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
  **/
};

module.exports.SocketHandler = SocketHandler;
