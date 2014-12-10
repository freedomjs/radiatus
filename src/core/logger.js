var winston = require('winston');
var config = require('config');

/**
 * Manages a set of named loggers from winston
 * @constructor
 **/
var Logger = function() {
  "use strict";
  this.loggers = {}; // Store name->logger
  winston.addColors(config.get('log.colors'));
};

/**
 * Retrieve a static named logger
 * Make sure we only return 1 logger for each name
 * @method
 * @param {String} name - name of logger
 * @return {Console} logger
 **/
Logger.prototype.getLogger = function(name) {
  "use strict";
  if (this.loggers.hasOwnProperty(name)) {
    return this.loggers[name];
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
  this.loggers[name] = logger;
  return logger;
};

// Keep a singleton
var instance = new Logger();
module.exports.getLogger = instance.getLogger.bind(instance);
module.exports.singleton = instance;
