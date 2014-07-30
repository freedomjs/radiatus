/** 
 * Radiatus Entry
 **/
var path = require('path');
var freedom = require('freedom');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var connect = require('connect');
var morgan  = require('morgan')

/** APPLICATION **/
var app = express();
var sessionStore = session.MemoryStore();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('../config');

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
//var userRouter = require('./userrouter');
var fileServer = require('./fileserver').serve(opts.path, opts.debug);
var ProcessManager = require('./processmanager').ProcessManager;
var processManager = new ProcessManager(sessionStore, cookieParser(config.sessionKey));

/** VIEW ENGINE **/
// View engine setup (only for errors right now)
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

/** LOGGER **/
// Request logger
if (opts.debug) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('common'));
}

/** SESSIONS/COOKIES **/
app.use(cookieParser());
// For alternatives, see
// https://github.com/senchalabs/connect/wiki
app.use(session({
  secret: config.sessionKey,
  store: sessionStore,
  name: 'session',
  resave: true,
  saveUninitialized: true
}));
io.set('authorization', processManager.onAuthorization.bind(processManager));

/** ROUTES **/
// socket.io endpoint
// @TODO - user management
io.on('connection', processManager.onConnection.bind(
  processManager, 
  'user', 
  path.join(__dirname, '../', opts.path)
));
// This serves static files from 'src/client/' (includes freedom.js)
app.use('/freedom.js', express.static(path.join(__dirname, 'client/freedom.js')));
// Serve files from the freedom.js dependency tree
app.use('/', fileServer);
//app.get('*', fileServer.route.bind(fileServer));
/**
app.all('/freedom/*', userRouter.route);
app.get('/freedom.js', function(req, res) {
  res.end(require('fs').readFileSync('./src/client/freedom.js'));
});
**/

/** START 'ER UP**/
http.listen(opts.port, function() {
  console.log("Radiatus is running on port " + opts.port);
});
