var Strategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;

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
      return cb(null, profile);
      // db.user.findOrCreateGoogle(profile, function(err, user) {
      //   return cb(err, user);
      // });
    }
  );
}
exports.facebookStrategy = function(db) {
  return new FacebookStrategy({
      clientID: 260071151360692,
      clientSecret: 'e313415021f00fec987c785e5c8088b2',
      callbackURL: "https://star-puzzle.io/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      return cb(null, profile);
    }
  );
}
exports.twitterStrategy = function(db) {
  return new TwitterStrategy({
      consumerKey: '1KeE23f3QP24pjrBwNnpilXNz',
      consumerSecret: '2Nj76zn4rHn60Nv3eLb4KDJSb4cIynk0vQpjmqqq51INGom13a',
      callbackURL: "https://star-puzzle.io/auth/twitter/callback"
    },
    function(token, tokenSecret, profile, cb) {
      return cb(null, profile);
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
