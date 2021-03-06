/** 
 * Radiatus Entry
 **/

// Currently looks for 'config/' in the cwd
// Change to where the script resides
process.env.NODE_CONFIG_DIR = __dirname + '/config'; 
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
  url: config.get('database.url')
}); 
var server = require('http').Server(app);
var io = require('socket.io')(server);
var logger = require('./core/logger').getLogger(path.basename(__filename));
mongoose.connect(config.get('database.url'));
mongoose.connection.on('error', function(logger, err) {
  "use strict";
  logger.error('Mongoose error:');
  logger.error(err);
}.bind(this, logger));
mongoose.connection.once('open', function(logger) {
  "use strict";
  logger.info('Mongoose connection online to database');
}.bind(this, logger));

/** OPTIONS PARSING **/
var opts = require('nomnom')
  .script("radiatus")
  .option('debug', {
    abbr: 'd',
    flag: true,
    help: 'Print debugging info'
  })
  .option('path', {
    position: 0,
    help: 'Application to serve',
    required: true
  })
  .parse();

/** SUBMODULES **/
var processManager = require('./core/processmanager').initialize(path.join(process.cwd(), opts.path));
var authRouter = require('./routes/auth').router;
var fileServer = require('./routes/fileserver').initialize(opts.path, opts.debug);
var socketHandler = new require("./routes/socket").initialize(sessionStore);

/** VIEW ENGINE **/
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
app.engine('ejs', ejsLocals);

/** LOGGER **/
if (opts.debug) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('common'));
}

/** STATIC CONTENT **/
app.use('/radiatus/public', express.static(path.join(__dirname, '../public')));

/** SESSIONS/COOKIES **/
app.use(cookieParser(config.get('webserver.sessionSecret')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(session({
  store: sessionStore,
  secret: config.get('webserver.sessionSecret'),
  name: config.get('webserver.cookieKey'),
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
// This regex detects any request for freedom[-for-*][.v*.*.*].js
app.use(/.*\/freedom(-for-[a-z]*)?(\.v(\.)?[0-9]*\.[0-9]*\.[0-9]*)?\.js/, express.static(path.join(__dirname, '../public/dist/freedom.js')));
// Serve files from the freedom.js dependency tree
app.use('/', fileServer);
//app.all('/freedom/*', userRouter.route);

module.exports = server;
