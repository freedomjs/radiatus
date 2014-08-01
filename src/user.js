var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('../config');

mongoose.connect(config.userDB);
mongoose.connection.on('error', console.error.bind(console, 'mongoose error:'));
mongoose.connection.once('open', function callback() {
  console.log('mongoose connection online');
});

/**
var userSchema = mongoose.Schema({
  local: {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true}
    //email: { type: String, required: true, unique: true },
  }
});
**/

var userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true}
    //email: { type: String, required: true, unique: true },
});

// Bcrypt middleware
userSchema.pre('save', function(next) {
	var user = this;

	if(!user.isModified('password')) return next();

	bcrypt.genSalt(config.saltWorkFactor, function(err, salt) {
		if(err) return next(err);

		bcrypt.hash(user.password, salt, function(err, hash) {
			if(err) return next(err);
			user.password = hash;
			next();
		});
	});
});

// Password verification
userSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err) return cb(err);
		cb(null, isMatch);
	});
};

// Seed a user
var User = mongoose.model('User', userSchema);
var user = new User({ username: 'bob', password: 'secret' });
user.save(function(err) {
  if(err) {
    console.log(err);
  } else {
    console.log('user: ' + user.username + " saved.");
  }
});

module.exports = mongoose.model('User', userSchema);
