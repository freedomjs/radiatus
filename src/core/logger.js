/**
 * Wraps some boilerplate winston setup
 **/

var winston = require('winston');
var config = require('config');

var loggers = {};   // Store name->logger
winston.addColors(config.get('log.colors'));

function getLogger(name) {
  if (loggers.hasOwnProperty(name)) {
    return loggers[name];
  }
  //Create new logger
  var opts = {
    console: {
      level: config.get('log.level'),
      colorize: true,
      timestamp: true,
      label: name
    }
  };
  winston.loggers.add(name, opts);
  var logger = winston.loggers.get(name);
  logger.setLevels(config.get('log.levels'));
  loggers[name] = logger;
  return logger;
}

module.exports = getLogger;
