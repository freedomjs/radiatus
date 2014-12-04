/*jshint browser:true */
/*global Promise*/

var EventInterface = require("freedom/src/proxy/eventInterface");
var ApiInterface = require("freedom/src/proxy/apiInterface");
var Consumer = require("freedom/src/consumer");
var util = require("./util");
var DEBUG = true;

(function(exports) {
  "use strict";
  /**
    * Initialization code for the client stub.
    * This will get retried every 10ms until the dependencies
    * are loaded or the retry limit is reached.
    *
    * @param {Object} exports - global (usually window)
    * @param {String} manifest - path to the manifest of the root freedom.js module
    * @param {Object} options - freedom.js options
    * @param {Function} resolve - function to call to resolve the freedom Promise
    * @param {Function} reject - function to call to reject the freedom Promise
    * @param {Number} retries - number of retries left for init
    **/
  function init(exports, manifest, options, resolve, reject, retries) {
    // Need to wait until dependencies have fully loaded
    if (typeof exports.io === "undefined" || 
        typeof exports.Cookies === "undefined" ||
        typeof exports.Promise === "undefined") {
      if (retries > 0) {
        setTimeout(init.bind({}, exports, manifest, options, resolve, reject, (retries-1)), 10);
      } else {
        console.error("freedom.js: Error importing dependencies");
      }
      return;
    }
    if (DEBUG) { console.log('freedom.js: Initializing connection to server'); }
    // Create socket to the server
    var csrfToken = exports.Cookies.get('XSRF-TOKEN');
    var socket = exports.io("/?csrf=" + csrfToken);
    // Get initialization information from the server
    socket.once("init", function(socket, resolve, reject, msg) {
      if (DEBUG) { console.log("message: init," + JSON.stringify(msg)); }
      var interfaceCls;
      if (this._config.type === "api") {
        interfaceCls = ApiInterface.bind({}, this._config.api);
      } else if (this._config.type === "event") {
        interfaceCls = EventInterface.bind({});
      } else {
        console.error("Invalid configuration from server");
      }
      var c = new Consumer(interfaceCls, console);
      c.onMessage("control", { channel: "default", name: "default", reverse: "default" });
      c.on("default", function(socket, msg) {
        console.log('out: ' + JSON.stringify(msg));
        socket.emit("default", msg);
      }.bind({}, socket));
      socket.on("default", function(c, msg) {
        console.log('in: ' + JSON.stringify(msg));
        c.onMessage("default", msg);
      }.bind({}, c));
      resolve(c.getInterface.bind(c));
    }.bind({}, socket, resolve, reject));
    socket.emit("init", {
      manifest: manifest,
      options: options
    });
    // Debug
    if (DEBUG) { exports.radiatusSocket = socket; }
  }

  // Dynamically load dependencies
  util.loadScript("/radiatus/public/bower_components/cookies-js/dist/cookies.min.js");
  util.loadScript("/socket.io/socket.io.js");
  if (typeof exports.Promise === "undefined") {
    util.loadScript("/radiatus/public/bower_components/es6-promise-polyfill/promise.js");
  }
  // Match the freedom.js external interface
  exports.freedom = function(manifest, options) {
    return new Promise(function(manifest, options, resolve, reject) {
      init(exports, manifest, options, resolve, reject, 100);
    }.bind({}, manifest, options));
  };

  console.log("freedom.js stub loaded");
})(window);
