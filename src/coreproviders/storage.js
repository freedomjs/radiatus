/*globals require,fdom:true*/
/*jslint indent:2,white:true,sloppy:true,node:true,nomen:true */

/**
 * core.storage provider for Radiatus runtime
 * Backed by Mongoose/MongoDB
 */

var mongoose = require('mongoose');

var keyValueSchema = mongoose.Schema({
  username: { type: String, required: true },
  key: { type: String, required: true},
  value: String
});

var KeyValue = mongoose.model('Storage', keyValueSchema);
/**
 * @constructor
 */
var Storage_node = function(username, channel, dispatch) {
  this.username = username;
  this.dispatchEvents = dispatch;
  this.channel = channel;
};

Storage_node.prototype.keys = function(continuation) {
  KeyValue.find({ username: this.username }, 'key', function(err, docs) {
    if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
    var retValue = [];
    if (docs) {
      for (var i=0; i<docs.length; i++) {
        retValue.push(docs[i].key);
      }
    }
    continuation(retValue);
  });
};

Storage_node.prototype.get = function(key, continuation) {
  KeyValue.findOne({ username: this.username, key: key }, function(err, doc) {
    if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
    if (!doc) { return continuation(null); }
    continuation(doc.value);
  }.bind(this));
};

Storage_node.prototype.set = function(key, value, continuation) {
  KeyValue.findOne({ username: this.username, key: key }, function(err, doc) {
    if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
    var retValue = null;
    if (!doc) {
      doc = new KeyValue({
        username: this.username,
        key: key,
        value: value
      });
    } else {
      retValue = doc.value;
      doc.value = value;
    }
    doc.save(function(err) {
      if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
      continuation(retValue);
    }.bind(this));
  }.bind(this));
};

Storage_node.prototype.remove = function(key, continuation) {
  KeyValue.findOneAndRemove({ username: this.username, key: key}, function(err, doc) {
    if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
    if (!doc) { return continuation(null); }
    return continuation(doc.value);
  });
};

Storage_node.prototype.clear = function(continuation) {
  KeyValue.remove({ username: this.username }, function(err) {
    if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
    continuation(null);
  });
};

Storage_node.prototype._createError = function(error, errcode) {
  console.error(error);
  return {
    'errcode': errcode,
    'message': error.message
  };
};

/** REGISTER PROVIDER **/
/**
if (typeof fdom !== 'undefined') {
  fdom.apis.register("core.storage", Storage_node);
}
**/
module.exports = Storage_node;
