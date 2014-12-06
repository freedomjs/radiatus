/*global jasmine, describe, it, expect, beforeEach, afterEach, spyOn*/
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

  it("connect fails without dependencies", function(done) {
    var exports = {};
    var c = new Client(false, exports);
    var resolve = function(iface) {};
    var reject = function(reason) {
      expect(reason).toEqual(jasmine.any(String));
      done();
    };
    c.connect("manifest", {}, resolve, reject, 1);
  });

  it("connect tries to open socket", function(done) {
    var socket = {
      once: function() {},
      on: function() {},
      emit: jasmine.createSpy("socket.emit")
    };
    var exports = {
      io: function(path) { return socket; },
      Cookies: { get: function(key) { return "csrf"; } },
      Promise: jasmine.createSpy("Promise")
    };
    //spyOn(exports, "io").and.callThrough();
    var c = new Client(false, exports);
    var resolve = function(iface) {
      console.log('resolve');
    };
    var reject = function(reason) { console.log('reject'); };
    c.connect("manifest", {}, resolve, reject, 1);
    //expect(exports.io.calls.argsFor(0)).toEqual(["/?csrf=csrf"]);
    expect(socket.emit).toHaveBeenCalledWith("init", jasmine.objectContaining({
      manifest: jasmine.any(String)
    }));
    done();
  });

});
