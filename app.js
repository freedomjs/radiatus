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

/** VIEW ENGINE **/
// View engine setup (only for errors right now)
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');
app.engine('ejs', ejsLocals);

/** LOGGER **/
// Request logger
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

/** ROUTES **/
// User authentication
app.use('/radiatus/auth', authRouter);
// Serve files from the freedom.js dependency tree
app.use('/', fileServer);

app.listen(8080, function() {
  console.log('Express server listening on port 8080');
});
