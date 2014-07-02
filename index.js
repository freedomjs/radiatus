var http = require('http');
var opts = require('nomnom')
  .option('debug', {
    abbr: 'd',
    flag: true,
    help: 'Print debugging info'
  })
  .option('port', {
    abbr: 'p',
    help: 'listening port',
    metavar: 'PORT',
    default: 8080
  })
  .option('path', {
    position: 0,
    help: 'Application to serve',
    required: true
  })
  .parse();

var manifest = opts.path;
var server = http.createServer(function(request, response) {
  
});

server.listen(opts.port);
console.log("Radiatus is running on port " + opts.port);
