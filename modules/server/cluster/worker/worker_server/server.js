var http = require('http'),
    express = require('express'),
    app = express();
    passport = require('passport'),
    flash = require('connect-flash'),
    serverModule = require('./module'),
    db = require('./db');

var session = require('express-session'),
    RedisStore = require('connect-redis')(session),
    redisUrl = process.env.REDISTOGO_URL || 'redis://127.0.0.1:6379';

var isServerDown = false;

exports.onReqSyncID = new Function();

exports.createServer = function() {
  initServerSetting();
  initRouter();
  db.user.connectDB();
  var server = http.createServer(app);
  // return app;
  return server;
}
exports.getUserData = function(uid, cb) {
  db.user.findById(uid, cb);
}
exports.serverDown = function() {
  isServerDown = true;
}
exports.cancelServerDown = function() {
  isServerDown = false;
}
function initServerSetting() {
  passport.use(serverModule.passport.localStrategy(db));
  passport.use(serverModule.passport.googleStrategy(db));
  passport.use(serverModule.passport.facebookStrategy(db));
  passport.use(serverModule.passport.twitterStrategy(db));
  passport.serializeUser(serverModule.passport.serialize());
  passport.deserializeUser(serverModule.passport.deserialize(db));

  app.set('views', './views');
  // __dirname + '/views');
  app.set('view engine', 'ejs');

  app.use(serverModule.CORS.allowCORS(['http://localhost', 'http://star-puzzle.io', 'https://star-puzzle.io']));

  app.use(require('cookie-parser')());
  app.use(require('body-parser').urlencoded({ extended: false }));
  // app.use(require('express-session')({ secret: '!!@@Secret Cat@@!!', resave: false, saveUninitialized: false }));

  var redisClient = require('redis').createClient(redisUrl);

  redisClient.on('error', function(err) {
    console.log(err);
  });

  app.use(session({
    store: new RedisStore({ client: redisClient, db: 15, ttl: 7 * 24 * 60 * 60 }),
      // 7 * 24 * 60 * 60 * 1000 }),
    secret: '!!@@Secret Cat@@!!',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 365 * 24 * 60 * 60 * 1000, secure: true }
  }));

  app.use(function(req, res, next) {
    if(!req.session) {
      return next(new Error('cant find session'));
    }
    next();
  });

  app.use(flash());

  app.use(express.static('./public'));
    //path.join(__dirname, 'public')));

  app.use(passport.initialize());
  app.use(passport.session());

  //error handle
  app.use(function(error, req, res, next) {
    console.log(error.stack);
    // delete cookie
    req.session.destroy(function (err) {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
    res.status(500).send('Something broken!');
    // res.json({ message: error.message });
  });
}

function initRouter() {
  app.get('/', function(req, res) {
    if (!isServerDown) {
      serverModule.router.getMain(req, res);
    } else {
      serverModule.router.getDown(req, res);
    }
  });

  // for test
  // app.get('/flash', function(req, res) {
  //   req.flash('info', 'Flash is back!')
  //   // res.end();
  //   res.redirect('/');
  // });

  // app.post('/play-as-guest', function(req, res, next) {
  //   passport.authenticate('local', function(err, user, info) {
  //     if (err) { return next(err); }
  //     if (!user) { return res.redirect('/'); }
  //     req.logIn(user, function(err) {
  //       if (err) { return next(err); }
  //       req.flash('info', 'WTFFFFFFFFFFFFFFFFFF');
  //       return serverModule.router.postPlayAsGuest(req, res);
  //     });
  //   })(req, res, next);
  // });
  app.post('/play-as-guest',
    passport.authenticate('local', { failureRedirect: '/login-fail' }),
    serverModule.router.postPlayAsGuest);

  app.post('/change-name',
    require('connect-ensure-login').ensureLoggedIn(),
    serverModule.router.postChangeName);

  app.post('/logout', serverModule.router.postLogout);

  app.post('/profile',
    require('connect-ensure-login').ensureLoggedIn(),
    serverModule.router.postProfile);

  app.post('/leave-game',
    require('connect-ensure-login').ensureLoggedIn(),
    // passport.authenticate('local', { failureRedirect: '/failToLogin' }),
    serverModule.router.postLeaveGame);

  app.get('/terms-and-conditions', serverModule.router.getTermsAndConditions);
  app.get('/privacy-policy', serverModule.router.getPrivacyPolicy);

  app.get('/error', serverModule.router.getError);
  app.get('/no-action', serverModule.router.getNoAction);
  app.get('/login-fail', serverModule.router.getFailToLogin);
  app.get('/duplicate-account', serverModule.router.getDuplicateAccount);

  // passport route
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login-fail' }),
    serverModule.router.getAuthSuccessGoogle);

  app.get('/auth/facebook',
    passport.authenticate('facebook'));

  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login-fail' }),
    serverModule.router.getAuthSuccessFacebook);

  app.get('/auth/twitter',
    passport.authenticate('twitter'));
  app.get('/auth/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/login-fail' }),
    serverModule.router.getAuthSuccessTwitter);

  app.post('/sync-uid',
    require('connect-ensure-login').ensureLoggedIn(),
    (req, res) => {
      if (!req.body) { res.sendStatus(400); }
      else {
        var sid = req.body.s;
        var pid = req.body.p;
        var uid = req.user.id;
        var name = req.user.displayName;
        exports.onReqSyncID(sid, uid, pid, name);
        res.end();
      }
    });

  app.post('/req-rank',
    require('connect-ensure-login').ensureLoggedIn(),
    (req, res) => {
      if (!req.body) { res.sendStatus(400); }
      else {
        var type = req.body.type;
        // var start = req.body.start;
        // var end = req.body.end;
        // db.user.getRank(start, end, (rankData) => {
        db.user.getRank(type, req.user.id, (rankData) => {
          res.send(rankData);
        });
      }
    });
  // router event handle
  serverModule.router.onUserJoinGame = function(uid) {
    db.user.userJoin(uid);
  }
  serverModule.router.onUserLeaveGame = function(user) {
    db.user.deleteUser(user);
  }
}
