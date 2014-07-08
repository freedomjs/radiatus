var http = require('http');
var freedom = require('freedom');
var express = require('express');

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

var fileServer = require('./fileServer').serve(opts.path);

var app = express();
app.all('/freedom/*', userRouter.route);
app.get('*', fileServer.route.bind(fileServer));

app.listen(opts.port);
console.log("Radiatus is running on port " + opts.port);

/*
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
  // Index page.
  if (request.url == '/index.html' || request.url == '/') {
    response.writeHead(200, {
      'Content-Length': index.length,
      'Context-Type': 'text/html'
    });
    response.end(index);
    return;
  }
  // Static Content.
  else if (manifest.app.static &&
      manifest.app.static.indexOf(request.url.substr(1)) > -1) {
    return;
  }

  // freedom.js
  else if (request.url == '/freedom.js') {
    fs.readFile('node_modules/freedom/freedom.js', "binary", function(err, file) {
      response.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': 'text/javascript'
      });
      response.write(file, "binary");
      response.end();
    });
    return;
  }

  // Otherwise...
  response.writeHead(404);
  response.end();
  return;

  if (userRouter.sessionExists(request, response)) {
    
  } else {
    
  }
});
*/
