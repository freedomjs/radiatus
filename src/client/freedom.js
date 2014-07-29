(function(exports) {
  var freedom = {};
  var socket = null;

  //Load socket.io client library
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '/socket.io/socket.io.js';
  var topScript = document.getElementsByTagName('script')[0];
  topScript.parentNode.insertBefore(script, topScript);

  function init(exports) {
    // Need to wait until socket.io has fully loaded
    if (typeof exports.io == 'undefined') {
      setTimeout(init.bind(this, exports), 0);
      return;
    }

    socket = exports.io();
  };
  init(exports);
  exports.freedom = freedom;
})(window);
