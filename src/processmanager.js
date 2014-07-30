var freedom = require('freedom-for-node');
var cookieParser = require('cookie-parser');

function ProcessManager(sessionStore, cookieParser) {
  this._sockets = {};
  this._fContexts = {};
  this._sessionStore = sessionStore;
  this._cookieParser = cookieParser;
  this._cookieKey = '';
}

ProcessManager.prototype.onAuthorization = function(handshakeData, accept) {
  console.log('onAuthorization');
  //console.log(handshakeData);
  console.log('------------');
  accept(null,true);
};

ProcessManager.prototype.onConnection = function(name, manifest, socket) {
  console.log('onConnection');
  console.log(socket.handshake.headers.cookie);
  console.log(socket.handshake.session);
  console.log('------------');

  //@TODO - replace hardcoded manifest
  var fContext = freedom.freedom(manifest, {
    debug: false
  });
  this._sockets[name] = socket;
  this._fContexts[name] = fContext;
  
  function Handler(socket) {
    this._label = null;
    this._socket = socket;
  }
  Handler.prototype.checkLabel = function(label) {
    this._label = label; 
    return true;
  }; 
  Handler.prototype.processData = function(data) {
    console.log('on:'+this._label+':'+JSON.stringify(data));
    this._socket.emit('message', {
      label: this._label,
      data: data
    });
  };

  var handler = new Handler(socket);
  fContext.on(
    handler.checkLabel.bind(handler),
    handler.processData.bind(handler)
  );

  socket.on('message', function(fContext, msg) {
    console.log('emit:'+msg.label+':'+JSON.stringify(msg.data));
    fContext.emit(msg.label, msg.data);
  }.bind(this, fContext));

  socket.on('disconnect', function() {
    console.log('user disconnected');
  }.bind(this));

};

module.exports.ProcessManager = ProcessManager;
