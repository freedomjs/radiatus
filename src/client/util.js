/*jshint browser:true*/

//Load JavaScript libraries
function loadScript(url) {
  "use strict";
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  var topScript = document.getElementsByTagName('script')[0];
  topScript.parentNode.insertBefore(script, topScript);
}

module.exports.loadScript = loadScript;
