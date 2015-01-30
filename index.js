#!/usr/bin/env node
var config = require("config");
var path = require("path");
var app = require("./src/app");
var logger = require('./src/core/logger').getLogger(path.basename(__filename));

var port = config.get("webserver.port");

/** START 'ER UP **/
app.listen(port, function() {
  "use strict";
  logger.info("Radiatus is listening on port " + port);
});
