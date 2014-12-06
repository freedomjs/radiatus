/*jshint*/

var EventInterface = require("freedom/src/proxy/eventInterface");
var ApiInterface = require("freedom/src/proxy/apiInterface");
var Consumer = require("freedom/src/consumer");

// Object exported on global => URL to source
var DEPENDENCIES = {
  io: "/radiatus/public/bower_components/cookies-js/dist/cookies.min.js",
  Cookies: "/socket.io/socket.io.js",
  Promise: "/radiatus/public/bower_components/es6-promise-polyfill/promise.js"
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
  * @param {Number} retries - number of retries left for init
  **/
Client.prototype.init = function(manifest, options, resolve, reject, retries) {
  "use strict";

  // Need to wait until dependencies have fully loaded
  if (typeof this._exports.io === "undefined" || 
      typeof this._exports.Cookies === "undefined" ||
      typeof this._exports.Promise === "undefined") {
    if (retries > 0) {
      setTimeout(this.init.bind(this, manifest, options, resolve, reject, (retries-1)), 10);
    } else {
      console.error("freedom.js: Error importing dependencies");
      reject("Failed to import dependencies");
    }
    return;
  }

  if (this._DEBUG) { console.log('freedom.js: Initializing connection to server'); }

  // Create socket to the server
  var csrfToken = this._exports.Cookies.get('XSRF-TOKEN');
  var socket = this._exports.io("/?csrf=" + csrfToken);

  // Get initialization information from the server
  socket.once("init", function(socket, resolve, reject, msg) {
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
      console.error("Invalid configuration from server");
      reject("Invalid configuration from the server");
      return;
    }

    // Wire up the consumer to the socket
    var c = new Consumer(interfaceCls, console);
    c.onMessage("control", { channel: "default", name: "default", reverse: "default" });
    c.on("default", function(socket, msg) {
      if (this._DEBUG) { console.log('consumer: default,' + JSON.stringify(msg)); }
      socket.emit("default", msg);
    }.bind({}, socket));
    socket.on("default", function(c, msg) {
      if (this._DEBUG) { console.log('socket: default,' + JSON.stringify(msg)); }
      c.onMessage("default", msg);
    }.bind({}, c));
    resolve(c.getProxyInterface());

    // Debug
    if (this._DEBUG) { this._exports.radiatusSocket = socket; }
    if (this._DEBUG) { this._exports.radiatusConsumer = c; }
  }.bind(this, socket, resolve, reject));

  // Send these parameters to the server to signal readiness
  socket.emit("init", {
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
