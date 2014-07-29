var freedom = require('freedom-for-node');

function ProcessManager() {
  this._sockets = {};
  this._fContexts = {};
}

ProcessManager.prototype.onConnection = function(name, socket) {
  console.log('a user connected');
  //@TODO - replace hardcoded manifest
  var fContext = freedom.freedom('../demo/tictak/manifest.json');
  this._sockets[name] = socket;
  this._fContexts[name] = fContext;
  
  //@TODO - need a generic listener
  fContext.on('stats', function(socket, data) {
    console.log(data);
    socket.emit('message', {
      label: 'stats',
      data: data
    });
  }.bind(this, socket));
  fContext.on('board', function(socket, data) {
    console.log(data);
    socket.emit('message', {
      label: 'board',
      data: data
    });
  }.bind(this, socket));

  socket.on('message', function(fContext, msg) {
    console.log(msg);
    fContext.emit(msg.label, msg.data);
  }.bind(this, fContext));

  socket.on('disconnect', function() {
    console.log('user disconnected');
  }.bind(this));

};

exports.ProcessManager = ProcessManager;
