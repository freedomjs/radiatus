/** 
 * Radiatus Entry
 **/
var path = require('path');
var http = require('http');
var freedom = require('freedom');
var express = require('express');
var morgan  = require('morgan')

/** OPTIONS PARSING **/
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

/** SUBMODULES **/
var userRouter = require('./userrouter');
var fileServer = require('./fileserver').serve(opts.path, opts.debug);

/** SETUP ROUTES **/
var app = express();
// View engine setup (only for errors right now)
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
// Request logger
if (opts.debug) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('common'));
}
// This serves static files from 'src/client/' (includes freedom.js)
app.use('/freedom.js', express.static(path.join(__dirname, 'client/freedom.js')));
// socket.io endpoint
app.all('/freedom/*', userRouter.route);
// Serve files from the freedom.js dependency tree
app.use('/', fileServer);
//app.get('*', fileServer.route.bind(fileServer));
/**
app.get('/freedom.js', function(req, res) {
  res.end(require('fs').readFileSync('./src/client/freedom.js'));
});
**/


/** START 'ER UP**/
app.listen(opts.port);
console.log("Radiatus is running on port " + opts.port);
