/*globals require,fdom:true*/
/*jslint indent:2,white:true,sloppy:true,node:true,nomen:true */

var mongoose = require('mongoose');
var config = require('../../config');

/**
mongoose.connect(config.userDB);
mongoose.connection.on('error', console.error.bind(console, 'mongoose error:'));
mongoose.connection.once('open', function callback() {
  console.log('mongoose connection online to userDB');
});
**/

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

};

Storage_node.prototype.get = function(key, continuation) {
  KeyValue.find({ username: this.username, key: key }, function(err, docs) {
    if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
    if (docs.length <= 0) { return continuation(null); }
    continuation(docs[0].value);
  }.bind(this));
};

Storage_node.prototype.set = function(key, value, continuation) {
  KeyValue.find({ username: this.username, key: key }, function(err, docs) {
    if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
    var retValue = null;
    var doc;
    if (docs.length <= 0) {
      doc = new KeyValue({
        username: this.username,
        key: key,
        value: value
      });
    } else {
      doc = docs[0];
      retValue = doc.value
      doc.value = value;
    }
    doc.save(function(err) {
      if (err) { return continuation(undefined, this._createError(err, 'UNKNOWN')); }
      continuation(retValue);
    }.bind(this));
  }.bind(this));
};

Storage_node.prototype.remove = function(key, continuation) {
  var old = this.store.get(key);
  this.store.del(key);
  continuation(old);
};

Storage_node.prototype.clear = function(continuation) {
  this.store.Store = {};
  this.store.save();
  continuation();
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
