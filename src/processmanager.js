var freedom = require('freedom-for-node');

function ProcessManager() {
  this._sockets = {};
  this._fContexts = {};
}

ProcessManager.prototype.onConnection = function(name, manifest, socket) {
  console.log('a user connected');
  //@TODO - replace hardcoded manifest
  var fContext = freedom.freedom(manifest);
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
    fContext.emit(msg.label, msg.data);
  }.bind(this, fContext));

  socket.on('disconnect', function() {
    console.log('user disconnected');
  }.bind(this));

};

exports.ProcessManager = ProcessManager;
