var http = require('http');
var freedom = require('freedom');
var fs = require('fs');
var path = require('path');
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
var userRouter = require('./userrouter');

var manifest = JSON.parse(require('fs').readFileSync(opts.path)),
    index;
if (manifest.app && manifest.app.index) {
  index = manifest.app.index;
} else {
  console.error("Could not run", opts.path, ": No Entry point specified.");
  process.exit(1);
}
index = fs.readFileSync(path.resolve(path.dirname(opts.path), index));

var server = http.createServer(function(request, response) {
  if(request.url=='/index.html' || request.url=='/') {
    response.end(index);
    return;
  }

  if (userRouter.sessionExists(request, response)) {
    
  } else {
    
  }
});

server.listen(opts.port);
console.log("Radiatus is running on port " + opts.port);
