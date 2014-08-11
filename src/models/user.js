/**
 * Mongoose model for a user account on the web server
 **/

var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('config');
var logger = require('../logger')('src/models/user.js');

var userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true},
  //email: { type: String, required: true, unique: true },
  name: {
    familyName: String,
    givenName: String
  }
});

// Bcrypt middleware - salt passwords
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

// Password verification
userSchema.methods.comparePassword = function(candidatePassword, cb) {
  logger.trace('userSchema.methods.comparePassword: enter');
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err) return cb(err);
		cb(null, isMatch);
	});
};

module.exports = mongoose.model('User', userSchema);
