/** 
 * Radiatus Entry
 **/

/** IMPORTS **/
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
var mongoose = require('mongoose');

/** EXPRESS APPLICATION **/
var config = require('config');
var app = express();
// For alternatives, see
// https://github.com/senchalabs/connect/wiki
//var sessionStore = new session.MemoryStore();
var MongoStore = require('connect-mongo')(session);
var sessionStore = new MongoStore({
  url: config.get('userDB')
}); 
var http = require('http').Server(app);
var io = require('socket.io')(http);
var logger = require('./src/core/logger').getLogger(path.basename(__filename));
mongoose.connect(config.get('userDB'));
mongoose.connection.on('error', function(logger, err) {
  "use strict";
  logger.error('Mongoose error:');
  logger.error(err);
}.bind(this, logger));
mongoose.connection.once('open', function(logger) {
  "use strict";
  logger.info('Mongoose connection online to userDB');
}.bind(this, logger));

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
var processManager = require('./src/core/processmanager').initialize(
  path.join(__dirname, opts.path)
);
var authRouter = require('./src/routes/auth').router;
var fileServer = require('./src/routes/fileserver').initialize(opts.path, opts.debug);
var socketHandler = new require("./src/routes/socket").initialize(sessionStore);

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
app.use(cookieParser(config.get('sessionSecret')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(session({
  store: sessionStore,
  secret: config.get('sessionSecret'),
  name: config.get('cookieKey'),
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(csrf());
app.use(flash());
io.set('authorization', socketHandler.onAuthorization.bind(socketHandler));

/** ROUTES **/
// socket.io endpoint
io.on('connection', socketHandler.onConnection.bind(socketHandler));
// User authentication
app.use('/radiatus/auth', authRouter);
// This serves static files from 'src/client/' (includes freedom.js)
app.use('*/freedom.js', express.static(path.join(__dirname, 'build/freedom.js')));
// Serve files from the freedom.js dependency tree
app.use('/', fileServer);
//app.all('/freedom/*', userRouter.route);

/** START 'ER UP**/
http.listen(opts.port, function() {
  "use strict";
  logger.info("Radiatus is running on port " + opts.port);
});
