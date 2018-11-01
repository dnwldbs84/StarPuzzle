var Strategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;

exports.localStrategy = function(db) {
  return new Strategy(
    function(username, password, cb) {
      db.user.createGuest(function(err, user) {
        return cb(err, user);
      });
    });
}

exports.googleStrategy = function(db) {
  return new GoogleStrategy({
      clientID: '699894960088-1etu7b6i26285s7jpmdfc3n65rs6345d.apps.googleusercontent.com',
      clientSecret: '4YDNX_mrMm0r9JXu1NRwaEfn',
      // clientID: GOOGLE_CLIENT_ID,
      // clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "https://star-puzzle.io/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      process.nextTick(function() {
        console.log('google strategy');
        return cb(null, profile);
      });
      // db.user.findOrCreateGoogle(profile, function(err, user) {
      //   return cb(err, user);
      // });
    }
  );
}
exports.facebookStrategy = function(db) {
  return new FacebookStrategy({
      clientID: 2239616269617512,
      clientSecret: '7320c99eeeb310d4eb5c6316a61d61a6',
      callbackURL: "https://star-puzzle.io/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      process.nextTick(function() {
        console.log('facebook strategy');
        return cb(null, profile);
      });
    }
  );
}
exports.serialize = function() {
  return function(user, cb) {
    console.log('serialize');
    cb(null, user.id);
  }
}

exports.deserialize = function(db) {
  return function(id, cb) {
    console.log('deserialize');
    console.log(id);
    db.user.findById(id, function(err, user) {
      if (err) return cb(err);
      cb(null, user);
    });
  }
}
