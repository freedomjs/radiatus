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
app.get('/freedom.js', function(req, res) {
  res.end(require('fs').readFileSync('node_modules/freedom/freedom.js'));
});
app.get('*', fileServer.route.bind(fileServer));

app.listen(opts.port);
console.log("Radiatus is running on port " + opts.port);
