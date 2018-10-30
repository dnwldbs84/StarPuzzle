exports.allowCORS = function(allowedOrigins) {
  return function(req, res, next) {
    // var allowedOrigins = ['http://localhost'];
    var origin = req.headers.origin;
    if(allowedOrigins.indexOf(origin) > -1){
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    // res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Max-Age', 86400);
    (req.method === 'OPTIONS') ? res.sendStatus(200) : next();
  }
}
