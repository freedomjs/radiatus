/*globals freedom:true, fdom, WebSocket, console, require*/
/*jslint sloppy:true*/
var config = require('config');
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
  this.isNode = false;
  if (typeof socket !== 'undefined') {
    WSImplementation = socket;
  } else if (typeof WebSocket !== 'undefined') {
    WSImplementation = WebSocket;
  } else if (typeof require !== 'undefined') {
    WSImplementation = require('ws');
    this.isNode = true;
  } else {
    console.error('Platform does not support WebSocket');
  }

  this.username = username;
  this.dispatchEvent = dispatchEvent;
  var newUrl = this.rewriteUrl(url);
  try {
    if (protocols) {
      this.websocket = new WSImplementation(url, protocols);
    } else {
      this.websocket = new WSImplementation(url);
    }
    this.websocket.binaryType = 'arraybuffer';
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

  if (this.isNode) {
    this.websocket.on('message', this.onMessage.bind(this));
    this.websocket.on('open', this.onOpen.bind(this));
    // node.js websocket implementation not compliant
    this.websocket.on('close', this.onClose.bind(this, {
      code: 0,
      reason: 'UNKNOWN',
      wasClean: true
    }));
    this.websocket.on('error', this.onError.bind(this));
  } else {
    this.websocket.onopen = this.onOpen.bind(this);
    this.websocket.onclose = this.onClose.bind(this);
    this.websocket.onmessage = this.onMessage.bind(this);
    this.websocket.onerror = this.onError.bind(this);
  }
};

WS.prototype.rewriteUrl = function(url) {
  if (!config.has('providerServers') ||
      !Array.isArray(config.get('providerServers'))) {
    return url;
  }
  var servers = config.get('providerServers');
  
  for (var i=0; i<servers.length; i++) {
    var toCheck = servers[i];
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
      // For node.js, we have to do weird buffer stuff
      if (this.isNode && toSend instanceof ArrayBuffer) {
        this.websocket.send(
          new Uint8Array(toSend), 
          { binary:true }, 
          this.onError.bind(this)
        );
      } else {
        this.websocket.send(toSend);
      }
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

WS.prototype.onMessage = function(event, flags) {
  var data = {};
  if (this.isNode && flags && flags.binary) {
    data.buffer = new Uint8Array(event).buffer;
  } else if (this.isNode) {
    data.text = event;
  } else if (typeof ArrayBuffer !== 'undefined' && event.data instanceof ArrayBuffer) {
    data.buffer = event.data;
  } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
    data.binary = event.data;
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
