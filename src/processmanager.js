var freedom = require('freedom-for-node');

function ProcessManager() {
  this.sockets = {};
  this.fContexts = {};
}

ProcessManager.prototype.onConnection = function(name, socket) {
  console.log('a user connected');
  var fContext = freedom.freedom('../demo/tictak/manifest.json');
  this.sockets[name] = socket;
  this.fContexts[name] = fContext;
  
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
