var redis = require('redis');

var redisUrl = process.env.REDISTOGO_URL || 'redis://127.0.0.1:6379';
var pub, sub;

exports.initRedis = function(cb) {
  pub = redis.createClient(redisUrl);
  sub = redis.createClient(redisUrl);

  sub.subscribe('global');
  sub.subscribe(process.pid);

  sub.on('message', cb);
}
exports.getPublisher =  function() {
  return pub;
}
