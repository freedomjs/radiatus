/*jshint*/

var EventInterface = require("freedom/src/proxy/eventInterface");
var ApiInterface = require("freedom/src/proxy/apiInterface");
var Consumer = require("freedom/src/consumer");

// Object exported on global => URL to source
var DEPENDENCIES = {
  Cookies: "/radiatus/public/dist/cookies.min.js",
  io: "/socket.io/socket.io.js",
  Promise: "/radiatus/public/dist/promise.js"
};

/**
 * A collection of functions to be used in generating the client stub
 * @constructor
 * @param {Boolean} debug - print to console?
 * @param {Object} exports - global (usually window)
 **/
var Client = function(debug, exports) {
  "use strict";
  this._DEBUG = debug;
  this._exports = exports;
  this._init();
  this._socket = null;
};

/**
  * Initialization code for the client stub.
  * This will get retried every 10ms until the dependencies
  * are loaded or the retry limit is reached.
  * @method
  * @param {String} manifest - path to the manifest of the root freedom.js module
  * @param {Object} options - freedom.js options
  * @param {Function} resolve - function to call to resolve the freedom Promise
  * @param {Function} reject - function to call to reject the freedom Promise
  * @param {Number} retries - number of retries left
  **/
Client.prototype.connect = function(manifest, options, resolve, reject, retries) {
  "use strict";

  // Need to wait until dependencies have fully loaded
  if (!this._haveDependencies()) {
    if (retries > 0) {
      setTimeout(this.connect.bind(this, manifest, options, resolve, reject, (retries-1)), 10);
    } else {
      if (this._DEBUG) { console.error("freedom.js: Error importing dependencies"); }
      reject("Failed to import dependencies");
    }
    return;
  }

  if (this._DEBUG) { console.log('freedom.js: Initializing connection to server'); }

  // Create socket to the server
  var csrfToken = this._exports.Cookies.get('XSRF-TOKEN');
  this._socket = this._exports.io("/?csrf=" + csrfToken, {
    reconnection: false
  });

  // Get initialization information from the server
  this._socket.once("init", function(resolve, reject, msg) {
    if (this._DEBUG) { console.log("socket: init," + JSON.stringify(msg)); }
    var interfaceCls;
    // Choose what type of interface to create
    if (msg.type === "api") {
      interfaceCls = ApiInterface.bind({}, msg.api);
      if (this._DEBUG) { console.log("freedom.js: creating an API interface"); }
    } else if (msg.type === "event") {
      interfaceCls = EventInterface.bind({});
      if (this._DEBUG) { console.log("freedom.js: creating an event interface"); }
    } else {
      if (this._DEBUG) { console.error("Invalid configuration from server"); }
      reject("Invalid configuration from the server");
      return;
    }

    // Wire up the consumer to the socket
    var c = new Consumer(interfaceCls, console);
    c.onMessage("control", { channel: "default", name: "default", reverse: "default" });
    c.on("default", function(msg) {
      if (this._DEBUG) { console.log('consumer: default,' + JSON.stringify(msg)); }
      this._socket.emit("default", msg);
    }.bind(this));
    this._socket.on("default", function(c, msg) {
      if (this._DEBUG) { console.log('socket: default,' + JSON.stringify(msg)); }
      c.onMessage("default", msg);
    }.bind(this, c));
    resolve(c.getProxyInterface());

    // Debug
    if (this._DEBUG) { this._exports.radiatusSocket = this._socket; }
    if (this._DEBUG) { this._exports.radiatusConsumer = c; }
  }.bind(this, resolve, reject));

  /** OAUTH **/
  // Redirect on command from the server
  this._socket.on("oauth", function(data) {
    if (this._DEBUG) { console.log("oAuth redirecting to " + JSON.stringify(data)); }
    //this._exports.open(data.authUrl);
    this._exports.location = data.authUrl;
  }.bind(this));
  if (this._exports.location && this._exports.location.hash &&
      this._exports.location.hash.indexOf("access_token") >= 0) {
    var responseUrl = this._exports.location.href;
    this._exports.location.hash = "";
    this._socket.emit("oauth", { responseUrl: responseUrl });
    if (this._DEBUG) { console.log("Detected access_token, sending responseUrl " + responseUrl); }
  }

  /** DISCONNECTION **/
  // Listen for disconnection events
  this._socket.on("disconnect", function(data) {
    console.error("Disconnected from Radiatus server");
  });

  // Send these parameters to the server to signal readiness
  this._socket.emit("init", {
    manifest: manifest,
    options: options
  });
};

/**
 * Load all of our dependencies
 * @private
 **/
Client.prototype._init = function() {
  "use strict";
  // Load every dependency
  for (var dep in DEPENDENCIES) {
    if (DEPENDENCIES.hasOwnProperty(dep)) {
      if (!this._exports.hasOwnProperty(dep)) {
        this._loadScript(DEPENDENCIES[dep]);
      }
    }
  }
};

/**
 * Checks to see if all dependencies are loaded on global
 * @private
 * @return {Boolean} whether all dependencies have loaded
 **/
Client.prototype._haveDependencies = function() {
  "use strict";
  for (var dep in DEPENDENCIES) {
    if (DEPENDENCIES.hasOwnProperty(dep)) {
      if (!this._exports.hasOwnProperty(dep)) {
        return false;
      }
    }
  }
  return true;
};

/**
  * Load JavaScript into the window by dynamically adding a script tag.
  * Currently places tag right before first script.
  * @private
  * @param {String} url - URL of script to load
  **/
Client.prototype._loadScript = function(url) {
  "use strict";
  var script = this._exports.document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  var topScript = this._exports.document.getElementsByTagName('script')[0];
  topScript.parentNode.insertBefore(script, topScript);
};

module.exports.Client = Client;
module.exports.dependencies = DEPENDENCIES;
