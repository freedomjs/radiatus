/*globals freedom:true, fdom, WebSocket, console, require*/
/*jslint sloppy:true*/
var config = require('../../config');
var urlParser = require('url');
var queryParser = require('querystring');

/**
 * A WebSocket core provider for Radiatus
 * Key feature is that if it detects the radiatus-providers server,
 * it will add a query string to the URL with special credentials
 *
 * @param {username} Username of the active user
 * @param {port.Module} module The Module requesting this provider
 * @param {Function} dispatchEvent Function to dispatch events.
 * @param {String} url The Remote URL to connect with.
 * @param {String[]} protocols SubProtocols to open.
 * @param {WebSocket?} socket An alternative socket class to use.
 */
var WS = function (username, module, dispatchEvent, url, protocols, socket) {
  var WSImplementation = null;
  if (typeof socket !== 'undefined') {
    WSImplementation = socket;
  } else if (typeof WebSocket !== 'undefined') {
    WSImplementation = WebSocket;
  } else if (typeof require !== 'undefined') {
    WSImplementation = require('ws');
  } else {
    console.error('Platform does not support WebSocket');
  }

  this.username = username;
  this.dispatchEvent = dispatchEvent;
  var newUrl = this.rewriteUrl(url);
  try {
    this.websocket = new WSImplementation(newUrl, protocols);
  } catch (e) {
    var error = {};
    if (e instanceof SyntaxError) {
      error.errcode = 'SYNTAX';
    } else {
      error.errcode = e.name;
    }
    error.message = e.message;
    dispatchEvent('onError', error);
    return;
  }

  this.websocket.onopen = this.onOpen.bind(this);
  this.websocket.onclose = this.onClose.bind(this);
  this.websocket.onmessage = this.onMessage.bind(this);
  this.websocket.onerror = this.onError.bind(this);
};

WS.prototype.rewriteUrl = function(url) {
  if (typeof config.providerServers == 'undefined' || 
      !Array.isArray(config.providerServers)) {
    return url;
  }
  
  for (var i=0; i<config.providerServers.length; i++) {
    var toCheck = config.providerServers[i];
    if (url.substr(0, toCheck.url.length) == toCheck.url) {
      parsedUrl = urlParser.parse(url);
      parsedQuery = queryParser.parse(parsedUrl.query);
      parsedQuery.radiatusSecret = toCheck.secret;
      parsedQuery.radiatusUsername = this.username;
      parsedUrl.search = '?' + queryParser.stringify(parsedQuery);
      return urlParser.format(parsedUrl);
    }
  }

  return url;
};

WS.prototype.send = function(data, continuation) {
  var toSend = data.text || data.binary || data.buffer;
  var errcode, message;

  if (toSend) {
    try {
      this.websocket.send(toSend);
    } catch (e) {
      if (e instanceof SyntaxError) {
        errcode = "SYNTAX";
      } else {
        errcode = "INVALID_STATE";
      }
      message = e.message;
    }
  } else {
    errcode = "BAD_SEND";
    message = "No text, binary, or buffer data found.";
  }

  if (errcode) {
    continuation(undefined, {
      errcode: errcode,
      message: message
    });
  } else {
    continuation();
  }
};

WS.prototype.getReadyState = function(continuation) {
  continuation(this.websocket.readyState);
};

WS.prototype.getBufferedAmount = function(continuation) {
  continuation(this.websocket.bufferedAmount);
};

WS.prototype.close = function(code, reason, continuation) {
  try {
    if (code && reason) {
      this.websocket.close(code, reason);
    } else {
      this.websocket.close();
    }
    continuation();
  } catch (e) {
    var errorCode;
    if (e instanceof SyntaxError) {
      errorCode = "SYNTAX";
    } else {
      errorCode = "INVALID_ACCESS";
    }
    continuation(undefined,{
      errcode: errorCode,
      message: e.message
    });
  }
};

WS.prototype.onOpen = function(event) {
  this.dispatchEvent('onOpen');
};

WS.prototype.onMessage = function(event) {
  var data = {};
  if (typeof ArrayBuffer !== 'undefined' && event.data instanceof ArrayBuffer) {
    data.buffer = data;
  } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
    data.binary = data;
  } else if (typeof event.data === 'string') {
    data.text = event.data;
  }
  this.dispatchEvent('onMessage', data);
};

WS.prototype.onError = function(event) {
  // Nothing to pass on
  // See: http://stackoverflow.com/a/18804298/300539
  this.dispatchEvent('onError');
};

WS.prototype.onClose = function(event) {
  this.dispatchEvent('onClose',
                     {code: event.code,
                      reason: event.reason,
                      wasClean: event.wasClean});
};


/** REGISTER PROVIDER **/
/**
if (typeof fdom !== 'undefined') {
  fdom.apis.register('core.websocket', WS);
}
**/
module.exports = WS;
