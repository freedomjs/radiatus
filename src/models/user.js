/**
 * Mongoose model for a user account on the web server
 **/

var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('config');
var logger = require('../core/logger')('src/models/user.js');

var userSchema = mongoose.Schema({
  // Unique username
  username: { type: String, required: true, unique: true },
  // Salted password
  password: { type: String, required: true},
  // email: { type: String, required: true, unique: true },
  // Name
  name: {
    familyName: String,
    givenName: String
  }
});

// Bcrypt middleware - salt passwords before saving
userSchema.pre('save', function(next) {
  logger.trace('userSchema.pre(save...: enter');
	if(!this.isModified('password')) return next();
	bcrypt.genSalt(config.get('saltWorkFactor'), function(err, salt) {
		if(err) return next(err);
		bcrypt.hash(this.password, salt, function(err, hash) {
			if(err) return next(err);
			this.password = hash;
			next();
		}.bind(this));
	}.bind(this));
});

// Bcrypt middleware - password verification
userSchema.methods.comparePassword = function(candidatePassword, cb) {
  logger.trace('userSchema.methods.comparePassword: enter');
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err) return cb(err);
		cb(null, isMatch);
	});
};

module.exports = mongoose.model('User', userSchema);
