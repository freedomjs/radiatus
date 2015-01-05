/*globals chrome,console */
/*jslint indent:2,browser:true, node:true */
var config = require("config");
var querystring = require("querystring");
var oAuthRedirectId = "freedom.oauth.redirect.handler";

/**
 * Custom oAuth provider for Radiatus web apps
 * @constructor
 * @param {UserContainer} usercontainer - associated user container to current user
 *   This is bound in src/core/usercontainer.js
 **/
var RadiatusAuth = function(usercontainer) {
  "use strict";
  this._redirectUri = config.get("webserver.url");
  this._usercontainer = usercontainer;

  this._continuations = {};
  this._setupListeners();
};

/**
 * Indicate the intention to initiate an oAuth flow, allowing an appropriate
 * oAuth provider to begin monitoring for redirection.
 *
 * @method initiateOAuth
 * @param {string[]} redirectURIs - oAuth redirection URIs registered with the
 *     provider.
 * @param {Function} continuation - Function to call when complete
 *    Expected to see a value of schema: {{redirect:String, state:String}}
 *    where 'redirect' is the chosen redirect URI
 *    and 'state' is the state to pass to the URI on completion of oAuth
 * @return {Boolean} true if can handle, false otherwise
 */
RadiatusAuth.prototype.initiateOAuth = function(redirectURIs, continuation) {
  "use strict";
  var i;
  for (i = 0; i < redirectURIs.length; i += 1) {
    if (redirectURIs[i].indexOf(this._redirectUri) === 0) {
      continuation({
        redirect: redirectURIs[i],
        state: oAuthRedirectId + Math.random()
      });
      return true;
    }
  }

  return false;
};

/**
 * oAuth client-side flow - launch the provided URL
 * This must be called after initiateOAuth with the returned state object
 *
 * @method launchAuthFlow
 * @param {String} authUrl - The URL that initiates the auth flow.
 * @param {Object.<string, string>} stateObj - The return value from initiateOAuth
 * @param {Function} continuation - Function to call when complete
 *    Expected to see a String value that is the response Url containing the access token
 */
RadiatusAuth.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  "use strict";
  var i, sockets = this._usercontainer.getSockets();
  // Save the continuation, waiting for an oauth event back from the client
  this._continuations[stateObj.state] = continuation;

  // Someone try to open this URL, plz
  for (i = 0; i < sockets.length; i++) {
    sockets[i].emit("oauth", { authUrl: authUrl });
  }
};

/**
 * Setup proper event listeners
 * @private
 **/
RadiatusAuth.prototype._setupListeners = function() {
  "use strict";
  this._usercontainer.on("socket", function(socket) {
    socket.on("oauth", function(data) {
      var hash = data.responseUrl.substr(data.responseUrl.indexOf('#')+1);
      var parsed = querystring.parse(hash);
      if (parsed.hasOwnProperty("state") &&
          this._continuations.hasOwnProperty(parsed.state)) {
        this._continuations[parsed.state](data.responseUrl);
        delete this._continuations[parsed.state];
      }
    }.bind(this));
  }.bind(this));
};

module.exports = RadiatusAuth;
