var path = require("path");
var logger = require("../core/logger").getLogger(path.basename(__filename));
var User = require("../models/user");
var processManager = require("../core/processmanager").singleton;

var SocketHandler = function(sessionStore, cookieParser, cookieKey) {
  logger.trace("constructor: enter");
  this._sessionStore = sessionStore;
  this._cookieParser = cookieParser;
  this._cookieKey = cookieKey;
};

SocketHandler.prototype.onAuthorization = function(handshakeData, accept) {
  logger.trace("onAuthorization: enter");

  if (!(handshakeData && handshakeData._query && handshakeData._query.csrf)) {
    logger.warn("onAuthorization: missing csrf token");
    accept("MISSING_CSRF", false);
    return;
  }
  
  this._cookieParser(handshakeData, {}, function(handshakeData, accept, err) {
    if (err) {
      logger.warn("onAuthorization: error parsing cookies");
      accept("COOKIE_PARSE_ERROR", false);
      return;
    }
    var sessionId = handshakeData.signedCookies[this._cookieKey];
    this._sessionStore.load(sessionId, function(handshakeData, accept, err, session) {
      if (err || !session) {
        logger.warn("onAuthorization: invalid session");
        accept("INVALID_SESSION", false);
        return;
      }
      var token = handshakeData._query.csrf;
      handshakeData.session = session;

      if (session.customCSRF !== token) {
        logger.warn("onAuthorization: invalid csrf token");
        accept("INVALID_CSRFTOKEN", false);
        return;
      }

      logger.trace("onAuthorization: valid session, continuing");
      accept(null, true);
    }.bind(this, handshakeData, accept));

  }.bind(this, handshakeData, accept));
};

SocketHandler.prototype.onConnection = function(socket) {
  logger.trace("onConnection: enter");
  console.log(socket.conn.request.session);
  console.log(socket.handshake.headers.cookie);

  if (!socket.conn || !socket.conn.request ||
      !socket.conn.request.session ||
      !socket.conn.request.session.passport ||
      !socket.conn.request.session.passport.user) {
    logger.warn("onConnection: unrecognized user");
    return;
  } 

  var id = socket.conn.request.session.passport.user;
  User.findById(id, function(socket, err, user) {
    if (err) {
      logger.warn("onConnection: error finding user");
      logger.warn(err);
      return;
    }

    var username = user.username;
    processManager.addSocket(username, socket);
  }.bind(this, socket));
};

/**
 * Keep a singleton
 **/
var socketHandler;
module.exports.initialize = function(sessionStore, cookieParser, cookieKey) {
  if (typeof socketHandler !== "undefined") {
    return socketHandler;
  }

  socketHandler = new SocketHandler(sessionStore, cookieParser, cookieKey);
  module.exports.singleton = socketHandler;
  return socketHandler;
};
module.exports.SocketHandler = SocketHandler;
