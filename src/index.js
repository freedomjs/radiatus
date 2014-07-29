/** 
 * Radiatus Entry
 **/
var path = require('path');
var freedom = require('freedom');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var morgan  = require('morgan')

/** APPLICATION **/
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

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
var processManager = new ProcessManager();

/** MIDDLEWARE **/
// View engine setup (only for errors right now)
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
// Request logger
if (opts.debug) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('common'));
}
// Setup sessions
app.use(cookieParser());
app.use(session({
  secret: 'secret',
  name: 'session',
  resave: true,
  saveUninitialized: true
}));

/** ROUTES **/
// socket.io endpoint
io.on('connection', processManager.onConnection.bind(processManager, 'user'));
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
