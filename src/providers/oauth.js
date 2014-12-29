/*globals chrome,console */
/*jslint indent:2,browser:true, node:true */
var config = require("config");
var oAuthRedirectId = "freedom.oauth.redirect.handler";

/**
 * Custom oAuth provider for Radiatus web apps
 * The behavior is slightly different than most oAuth providers
 * - We have to signal to the client-side stub to either
 *   pop-up a new window or navigate away from the current page.
 * - We also allow the operator of the Radiatus web server
 *   to force the redirect URL to itself.
 **/
var RadiatusAuth = function(usercontainer) {
  "use strict";
  this.redirectUri = config.get("webserver.url");
  this.usercontainer = usercontainer;
};

RadiatusAuth.prototype.initiateOAuth = function(redirectURIs, continuation) {
  "use strict";
  var i;
  for (i = 0; i < redirectURIs.length; i += 1) {
    if (redirectURIs[i].indexOf('http://') === 0 ||
        redirectURIs[i].indexOf('https://') === 0) {
      continuation({
        //redirect: redirectURIs[i],
        redirect: this.redirectUri,
        state: oAuthRedirectId + Math.random()
      });
      return true;
    }
  }

  return false;
};

RadiatusAuth.prototype.launchAuthFlow = function(authUrl, stateObj, continuation) {
  console.log(authUrl);
  //continuation(responseUrl);
};

/**
 * If we have access to chrome.identity, use the built-in support for oAuth flows
 * chrome.identity exposes a very similar interface to core.oauth.
 */
module.exports = RadiatusAuth;
