var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('../config');

mongoose.connect(config.userDB);
mongoose.connection.on('error', console.error.bind(console, 'mongoose error:'));
mongoose.connection.once('open', function callback() {
  console.log('mongoose connection online');
});

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
	if(!this.isModified('password')) return next();
	bcrypt.genSalt(config.saltWorkFactor, function(err, salt) {
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
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err) return cb(err);
		cb(null, isMatch);
	});
};

module.exports = mongoose.model('User', userSchema);
