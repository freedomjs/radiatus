var KEYSTORE_PATH = 'keystore.db';

var Cookies = require("cookies");
var keygrip = require("keygrip");
var fs = require('fs');

// Make a new Key on each startup. Limit to 10.
var keyManager;
require('crypto').randomBytes(48, function(ex, buf) {
  var key = buf.toString('hex');
  var existing = [];
  if (fs.existsSync(KEYSTORE_PATH)) {
    existing = JSON.parse(require('fs').readFileSync(KEYSTORE_PATH));
  }
  existing.unshift(key);
  if (existing.length > 10) {
    existing.pop();
  }
  require('fs').writeFileSync(KEYSTORE_PATH, JSON.stringify(existing));
  keyManager = keygrip(existing);
});

exports.sessionExists = function(request, response) {
  var cookies = new Cookies(request, response, keyManager);
  return !!cookies.get('sid', {signed: true});
};

exports.getInstance = function(request, response) {
  var cookies = new Cookies(request, response, keyManager);
  if (cookies.get('sid', {signed: true})) {
    
  } else {
    // No Cookie :(
    cookies.set();
  }
};

exports.route = function(req, res) {
  console.log('got request for ', req.params[0]);
  res.end('whoo!');
};
