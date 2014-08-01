var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('../config');
mongoose.connect(config.userDB);
mongoose.connection.on('error', console.error.bind(console, 'mongoose error:'));
mongoose.connection.once('open', function callback() {
  console.log('mongoose connection online');
});


var userSchema = mongoose.Schema({
  local: {
    username: String,
    password: String
  }
});

userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.local.password);
};

module.exports = mongoose.model('User', userSchema);
