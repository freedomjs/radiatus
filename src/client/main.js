/*jshint browser:true */
/*global Promise*/

(function(exports) {
  "use strict";
  var DEBUG = true;
  var Client = require("./client").Client;
  var client = new Client(DEBUG, exports);
  
  // Dynamically load dependencies
  client.loadScript("/radiatus/public/bower_components/cookies-js/dist/cookies.min.js");
  client.loadScript("/socket.io/socket.io.js");
  if (typeof exports.Promise === "undefined") {
    client.loadScript("/radiatus/public/bower_components/es6-promise-polyfill/promise.js");
  }

  // Export the freedom.js external interface
  exports.freedom = function(manifest, options) {
    return new Promise(function(manifest, options, resolve, reject) {
      client.init(manifest, options, resolve, reject, 100);
    }.bind({}, manifest, options));
  };

  if (DEBUG) { console.log("freedom.js stub loaded"); }
})(window);
