/*global describe, it, before, beforeEach, afterEach */
var path = require("path");
var expect = require("expect.js");
var sinon = require("sinon");
var Client = require("./client").Client;
var dependencies = require("./client").dependencies;

describe(path.basename(__filename), function() {
  "use strict";
  before(function(done) {
    Client.prototype._loadScript = sinon.spy();
    done();
  });

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    done();
  });

  it("loads dependencies", function(done) {
    var c = new Client(false, {});
    for (var dep in dependencies) {
      if (dependencies.hasOwnProperty(dep)) {
        expect(c._loadScript.calledWith(dependencies[dep])).to.be(true);
      }
    }
    done();
  });

  it("connect fails without dependencies", function(done) {
    var exports = {};
    var c = new Client(false, exports);
    var resolve = function(iface) {};
    var reject = function(reason) {
      expect(reason).to.be.a("string");
      done();
    };
    c.connect("manifest", {}, resolve, reject, 1);
  });

  it("connect tries to open socket", function(done) {
    var socket = {
      once: function(tag, cb) { cb({type: 'event'}); },
      on: function() {},
      emit: sinon.spy()
    };
    var exports = {
      io: function(path) { return socket; },
      Cookies: { get: function(key) { return "csrf"; } },
      Promise: sinon.spy() 
    };
    var c = new Client(false, exports);
    var resolve = function(iface) {
      expect(iface).not.to.be(undefined);
      done();
      console.log('resolve');
    };
    var reject = function(reason) { console.log('reject'); };
    c.connect("manifest", {}, resolve, reject, 1);
    expect(socket.emit.calledWith("init", sinon.match({
      manifest: sinon.match.string
    }))).to.be(true);
  });
});
