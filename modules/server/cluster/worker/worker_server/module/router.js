var publicFunctions = require('../../../../../public').publicFunctions;

exports.onUserJoinGame = new Function();
exports.onUserLeaveGame = new Function();

exports.getMain = function(req, res) {
  var duplicate = false;
  if (req.flash('info') == 'duplicate') {
    duplicate = true;
  }

  if (req.user) {
    console.log('getMain');
    console.log(req.session.userID);
    if (!req.session.userID) { req.session.userID = req.user.id; }
    exports.onUserJoinGame(req.user.id);
  }
  // console.log('in get main');
  // console.log(req.session);
  res.render('index', { user: setClientUser(req.user), duplicate: duplicate });
  // if(req.user) {
  //   // console.log(req.user);
  // } else {
  //   console.log('send status 400?');
  // }
}
exports.getDown = function(req, res) {
  res.render('serverDown');
}
exports.postPlayAsGuest = function(req, res) {
  if (!req.session.userID) { req.session.userID = req.user.userID; }
  res.send({ user: setClientUser(req.user) });
}
exports.postChangeName = function(req, res) {
  if (req.body.name) {
    var name = req.body.name;
    var checkedName = publicFunctions.checkName(name, 3, 15);
    db.user.changeName(req.user.id, checkedName, (isSuccess) => {
      res.end();
    });
  }
}

exports.postLogout = function(req, res) {
  req.session.destroy(function (err) {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

exports.postLeaveGame = function(req, res) {
  req.session.destroy(function (err) {
    // var user = req.user;
    exports.onUserLeaveGame(req.user);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

exports.postProfile = function(req, res) {
  res.send({ user: setClientUser(req.user) });
}
exports.getAuthSuccess = function(req, res) {
  console.log('getAuthSuccess');
  // console.log(req.user);
  // console.log(req.session.userID);
  if (req.user) {
    if (req.session.userID) {
      console.log('merging');
      db.user.findOrMergingGoogle(req.session.userID, req.user, onComplete, onDuplicate);
    } else {
      console.log('create');
      db.user.findOrCreateGoogle(req.user, onComplete);
    }
  }
  function onComplete(err, result) {
    if (err) { exports.getFailToLogin(req, res); }
    else {
      req.session.userID = result.id;
      req.session.passport.user = result.id;
      req.user = result;

      console.log('on complete google');

      res.redirect('/');
    }
  }
  function onDuplicate(err, result) {
    req.session.passport.user = req.session.userID;

    console.log('on duplicate google');
    req.flash('info', 'duplicate');

    if (err) { exports.getFailToLogin(req, res); }
    else { res.redirect('/'); }
  }
}
exports.getError = function(req, res) {
  res.render('error', { text: 'Sorry, Unexpected Error has occured.' });
}
exports.getNoAction = function(req, res) {
  res.render('error', { text: 'No response for a long time.' });
}
exports.getFailToLogin = function(req, res) {
  // res.redirect('/');
  res.render('error', { text: 'Fail to login.' });
}
exports.getDuplicateAccount = function(req, res) {
  res.render('error', { text: 'Account is used by another client.' });
}

function setClientUser(user) {
  if (user) {
    var isGuest = true;
    if (user.googleId) { isGuest = false; }
    var isFirst = true;
    if (user.playPvcCount) { isFirst = false; }
    // if (user.reConnCount || user.pvpWinCount || user.pvpLoseCount
    //   || user.playSoloCount || user.playPvcCount) { isFirst = false; }
    return {
      id: user.id,
      displayName: user.displayName,
      rating: user.rating,
      pvpWinCount: user.pvpWinCount,
      soloBestScore: user.soloBestScore,
      soloTodayDate: user.soloTodayDate,
      soloTodayBestScore: user.soloTodayBestScore,
      pvcClearDiff: user.pvcClearDiff,
      isGuest: isGuest,
      isFirst: isFirst
    }
  }
}
