/** 
 * Radiatus Entry
 **/

var path = require('path');
var express = require('express');
var ejsLocals = require('ejs-locals');
var morgan  = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var session = require('express-session');
var passport = require('passport');
var csrf = require('csurf');
var flash = require('connect-flash');

/** APPLICATION **/
var app = express();
// For alternatives, see
// https://github.com/senchalabs/connect/wiki
var sessionStore = new session.MemoryStore();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('./config');

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
var authRouter = require('./src/auth');
var fileServer = require('./src/fileserver').serve(opts.path, opts.debug);
var ProcessManager = require('./src/processmanager').ProcessManager;
var processManager = new ProcessManager(
  path.join(__dirname, opts.path),
  sessionStore, 
  cookieParser(config.sessionSecret),
  config.cookieKey
);

/** VIEW ENGINE **/
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');
app.engine('ejs', ejsLocals);

/** LOGGER **/
if (opts.debug) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('common'));
}

/** STATIC CONTENT **/
app.use('/radiatus/public', express.static(path.join(__dirname, 'public')));

/** SESSIONS/COOKIES **/
app.use(cookieParser(config.sessionSecret));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(session({
  store: sessionStore,
  secret: config.sessionSecret,
  name: config.cookieKey,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(csrf());
app.use(flash());
io.set('authorization', processManager.onAuthorization.bind(processManager));

/** ROUTES **/
// socket.io endpoint
// @TODO - user management
io.on('connection', processManager.onConnection.bind(
  processManager
));

// User authentication
app.use('/radiatus/auth', authRouter);
// This serves static files from 'src/client/' (includes freedom.js)
app.use('/freedom.js', express.static(path.join(__dirname, 'src/client/freedom.js')));
// Serve files from the freedom.js dependency tree
app.use('/', fileServer);
//app.all('/freedom/*', userRouter.route);

/** START 'ER UP**/
http.listen(opts.port, function() {
  console.log("Radiatus is running on port " + opts.port);
});
