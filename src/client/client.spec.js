/*global jasmine, describe, it, expect, beforeEach, afterEach, it*/
var path = require("path");
var Client = require("./client").Client;
var dependencies = require("./client").dependencies;

describe(path.basename(__filename), function() {
  "use strict";
  var client;

  beforeEach(function(done) {
    Client.prototype._loadScript = jasmine.createSpy("_loadScript");
    done();
  });

  afterEach(function(done) {
    done();
  });

  it("loads dependencies", function(done) {
    var c = new Client(false, {});
    for (var dep in dependencies) {
      if (dependencies.hasOwnProperty(dep)) {
        expect(c._loadScript).toHaveBeenCalledWith(dependencies[dep]);
      }
    }
    done();
  });
});
