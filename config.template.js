module.exports = {
  sessionSecret: 'secret key',
  cookieKey: 'session',
  userDB: 'mongodb://localhost:27017/radiatus',
  openRegistration: true,
  saltWorkFactor: 10,
  replaceDependency: {
    social: 'node_modules/radiatus-providers/src/providers/social.radiatus.json'
  },
  providerServers: [{
    url: 'ws://localhost:8082',
    secret: 'secret'
  }]
};
