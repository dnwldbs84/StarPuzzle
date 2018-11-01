var mysql = require('mysql');
    conn = null;

var module = require('./module');
    model = require('./model');

exports.connectDB = function() {
  conn = module.connectDB.connect(mysql);
  if(conn) {
    module.query.setMysql(mysql);
    conn.on('error', function(err) {
      if (!err.fatal) return;
      if (err.code !== 'PROTOCOL_CONNECTION_LOST') throw err;

      console.log('reconnecting mysql !!!');

      exports.connectDB();
    });
    console.log('mysql connect success');
  }
}
exports.findOrCreateGoogle = function(profile, cb) {
  process.nextTick(function() {
    // check already join
    module.query.findData(conn, 'user', 'googleId', profile.id, function(err, result) {
      if (result) {
        console.log('on find google');
        console.log(result);
        cb(err, result);
      } else {
        // create new user
        var user = new model.UserModel({ displayName: profile.displayName, googleId: profile.id });
        // var user = {
        //   googleId: profile.id,
        //   displayName: profile.displayName,
        // }
        module.query.insertData(conn, 'user', user, function(insertResult) {
          module.query.findData(conn, 'user', 'id', insertResult.insertId, function(err, findResult) {
            cb(err, findResult);
          });
        });
      }
    });
  });
}
exports.findOrMergingGoogle = function(userID, profile, cb, onDuplicate) {
  process.nextTick(function() {
    module.query.findData(conn, 'user', 'id', userID, function(err, result) {
      if (result) {
        if (result.googleId || result.facebookId)) {
          console.log('on find google(merging)');
          cb(null, result);
        } else {
          // check already registed;
          module.query.findData(conn, 'user', 'googleId', profile.id, function(err, checkResult) {
            if (!checkResult) {
              var query = 'UPDATE user SET googleId=' + profile.id + ', displayName="' + profile.displayName + '" WHERE id=' + userID;
              module.query.queryDirectly(conn, query, function(updateResult) {
                // module.query.updateMultiData(conn, 'user', userID, 'googleId', profile.id, 'displayName', profile.displayName, function (updateResult) {
                  console.log('on merging google');
                  module.query.findData(conn, 'user', 'id', userID, function(err, findResult) {
                    cb(err, findResult);
                  });
                });
            } else {
              console.log('on find google(merging, duplicate)');
              onDuplicate(null, checkResult);
            }
          });
        }
      } else { cb(err); }
    });
  });
}
exports.findOrCreateFacebook = function(profile, cb) {
  process.nextTick(function() {
    // check already join
    module.query.findData(conn, 'user', 'facebookId', profile.id, function(err, result) {
      if (result) {
        console.log('on find facebook');
        console.log(result);
        cb(err, result);
      } else {
        // create new user
        var user = new model.UserModel({ displayName: profile.displayName, facebookId: profile.id });
        // var user = {
        //   googleId: profile.id,
        //   displayName: profile.displayName,
        // }
        module.query.insertData(conn, 'user', user, function(insertResult) {
          module.query.findData(conn, 'user', 'id', insertResult.insertId, function(err, findResult) {
            cb(err, findResult);
          });
        });
      }
    });
  });
}
exports.findOrMergingFacebook = function(userID, profile, cb, onDuplicate) {
  process.nextTick(function() {
    module.query.findData(conn, 'user', 'id', userID, function(err, result) {
      if (result) {
        if (result.googleId || result.facebookId)) {
          console.log('on find facebook(merging)');
          cb(null, result);
        } else {
          // check already registed;
          module.query.findData(conn, 'user', 'facebookId', profile.id, function(err, checkResult) {
            if (!checkResult) {
              var query = 'UPDATE user SET facebookId=' + profile.id + ', displayName="' + profile.displayName + '" WHERE id=' + userID;
              module.query.queryDirectly(conn, query, function(updateResult) {
                // module.query.updateMultiData(conn, 'user', userID, 'googleId', profile.id, 'displayName', profile.displayName, function (updateResult) {
                  console.log('on merging facebook');
                  module.query.findData(conn, 'user', 'id', userID, function(err, findResult) {
                    cb(err, findResult);
                  });
                });
            } else {
              console.log('on find facebook(merging, duplicate)');
              onDuplicate(null, checkResult);
            }
          });
        }
      } else { cb(err); }
    });
  });
}
exports.createGuest = function(cb) {
  process.nextTick(function() {
    // find id
    module.query.findLastID(conn, 'user', function(err, result) {
      if (err) throw err;
      var id = result + 1;
      // create guest
      var user = new model.UserModel({ id: id, displayName: 'Guest' + id });
      // var user = {
      //   id: id,
      //   displayName: 'Guest' + id
      // }
      module.query.insertData(conn, 'user', user, function(insertResult) {
        if (insertResult.affectedRows) {
          module.query.findData(conn, 'user', 'id', insertResult.insertId, function(err, findResult) {
            cb(err, findResult);
          });
        }
      });
    });
  });
}

exports.findById = function(id, cb) {
  process.nextTick(function() {
    module.query.findData(conn, 'user', 'id', id, function(err, result) {
      cb(err, result);
    });
  });
}

exports.findUserData = function(id, col, cb) {
  process.nextTick(function() {
    module.query.findData(conn, 'user', 'id', id, function(err, result) {
      cb(err, result[col]);
    });
    // module.query.findColumnData(conn, col, 'user', id, function(err, result) {
    //   cb(err, result);
    // })
  });
}
exports.updateUserData = function(id, col, colData) {
  process.nextTick(function() {
    module.query.updateData(conn, 'user', id, col, colData, function(result) {
      console.log('updateData');
      console.log(result);
    });
  });
}
exports.updateUserMultiData = function(id, col1, colData1, col2, colData2) {
  process.nextTick(function() {
    module.query.updateMultiData(conn, 'user', id, col1, colData1, col2, colData2, function(result) {
      console.log('updateMultiData');
      console.log(result);
    });
  });
}
exports.userJoin = function(id) {
  process.nextTick(function() {
    module.query.findData(conn, 'user', 'id', id, function(err, result) {
      if (result) {
        var now = exports.dateToStr(new Date());
        if (result.joinDate) {
          // update lastConnDate and reConnCount
          var reConnCount = result.reConnCount ? result.reConnCount + 1 : 1;
          if (exports.dbDateToStr(result.lastConnDate) !== now) {
            process.nextTick(function() {
              module.query.updateMultiData(conn, 'user', id, 'lastConnDate', now, 'reConnCount', reConnCount, function(result) {
                console.log('update connect data');
                console.log(result);
              });
            });
          }
        } else {
          // set joinDate and lastConnDate
          process.nextTick(function() {
            module.query.updateMultiData(conn, 'user', id, 'joinDate', now, 'lastConnDate', now, function(result) {
              console.log('set join data');
              console.log(result);
            });
          });
        }
      }
    });
  });
}

exports.changeName = function(id, newName, cb) {
  process.nextTick(function() {
    var query = 'UPDATE user SET displayName="' + newName + '" WHERE id=' + id;
    module.query.queryDirectly(conn, query, function(result) {
      cb();
    });
    // module.query.updateData(conn, 'user', id, 'displayName', newName, cb);
  });
}
exports.deleteUser = function(user) {
  process.nextTick(function() {
    module.query.deleteUser(conn, 'user', 'id', user.id, function(result) {
      console.log('deleteUser')
      console.log(result);
    });
  });
}
exports.updateSoloGameScore = function(id, score) {
  process.nextTick(function() {
    module.query.findData(conn, 'user', 'id', id, function(err, result) {
      if (result) {
        var now = exports.dateToStr(new Date());
        if (result.soloBestScore < score) {
          // update all
          var query = 'UPDATE user SET soloBestScoreDate = ' + now +
            ', soloBestScore = ' + score + ', soloTodayDate = ' + now +
            ', soloTodayBestScore = ' + score + ' WHERE id = ' + id;
          module.query.queryDirectly(conn, query, function(result) {
            console.log('soloBestScore update');
          });
        } else if (exports.dbDateToStr(result.soloTodayDate) !== now) {
          // update today data
          module.query.updateMultiData(conn, 'user', id, 'soloTodayDate', now, 'soloTodayBestScore', score, function(result) {
            console.log('soloTodayDate update');
          });
        } else if (result.soloTodayBestScore < score) {
          // update today score only
          module.query.updateData(conn, 'user', id, 'soloTodayBestScore', score, function(result) {
            console.log('soloTodayBestScore update');
          });
        }
      }
    });
  });
}
exports.updatePVCClearDiff = function(id, diff) {
  process.nextTick(function() {
    module.query.findData(conn, 'user', 'id', id, function(err, result) {
      if (result) {
        var beforeDiff = result.pvcClearDiff;
        if (diff > beforeDiff) {
          // update
          module.query.updateData(conn, 'user', id, 'pvcClearDiff', diff, function(result) {
            console.log('pvcClearDiff update');
          });
        }
      }
    });
  });
}
// userDB.updateUserMultiData(client.uid, 'pvpWinCount', result.pvpWinCount + 1,
//                                        'rating', newRating);
exports.updateUserPVPGameData = function(user, isWin, newRating) {
  var now = exports.dateToStr(new Date());
  var updateCol = 'pvpWinCount';
  var updateColVal = user.pvpWinCount + 1;
  if (!isWin) {
    updateCol = 'pvpLoseCount';
    updateColVal = user.pvpLoseCount + 1;
  }
  if (!user.pvpLastGameDate || exports.dbDateToStr(user.pvpLastGameDate) !== now) {
    // update lastPvPDate
    var query = 'UPDATE user SET ' + updateCol + ' = ' + updateColVal +
                ', rating = ' + newRating + ', pvpLastGameDate = ' + now + ' WHERE id = ' + user.id;
    module.query.queryDirectly(conn, query, function(result) {
      console.log('pvpLastGameDate update');
    });
  } else {
    exports.updateUserMultiData(user.id, updateCol, updateColVal, 'rating', newRating);
  }
}
// SELECT id FROM ' + table + ' ORDER BY id DESC LIMIT 1
// exports.getRank = function(start, end, cb) {
exports.getRank = function(type, uid, cb) {
  var rankType = 'rating'
  switch (type) {
    case 'pvp':
      var query =
      'SELECT' +
      	' id, displayName, rating,' +
        ' ( @real_rank := IF ( @last > rating, @real_rank:=@rank+1, @real_rank )) AS realRank,' +
      	' ( @rank := @rank + 1 ) AS r,' +
      	' ( @last := rating )' +
      ' FROM' +
      	' user AS u,' +
      	' ( SELECT @rank := 0, @last := 0, @real_rank := 1) AS b' +
      ' WHERE' +
      	' pvpLastGameDate >= date_add(now(), interval -7 day)' +
      ' ORDER BY' +
      	' u.rating DESC LIMIT 30';
      module.query.queryDirectly(conn, query, function(result) {
        var returnVal = [];
        for (var i=0; i<result.length; i++) {
          if (result[i].id == uid) {
            returnVal.push({ n: result[i].displayName, r: result[i].realRank, t: result[i].rating, m: true});
          } else {
            returnVal.push({ n: result[i].displayName, r: result[i].realRank, t: result[i].rating });
          }
        }
        cb(returnVal);
      });
      break;
    case 'solo_today':
      var query =
      'SELECT' +
        ' id, displayName, soloTodayBestScore,' +
        ' ( @real_rank := IF ( @last > soloTodayBestScore, @real_rank:=@rank+1, @real_rank )) AS realRank,' +
        ' ( @rank := @rank + 1 ) AS r,' +
        ' ( @last := soloTodayBestScore )' +
      ' FROM' +
        ' user AS u,' +
        ' ( SELECT @rank := 0, @last := 0, @real_rank := 1) AS b' +
      ' WHERE' +
        ' soloTodayDate >= date_add(now(), interval -1 day)' +
      ' ORDER BY' +
        ' u.soloTodayBestScore DESC LIMIT 30';
      module.query.queryDirectly(conn, query, function(result) {
        var returnVal = [];
        for (var i=0; i<result.length; i++) {
          if (result[i].id == uid) {
            returnVal.push({ n: result[i].displayName, r: result[i].realRank, t: result[i].soloTodayBestScore, m: true});
          } else {
            returnVal.push({ n: result[i].displayName, r: result[i].realRank, t: result[i].soloTodayBestScore });
          }
        }
        cb(returnVal);
      });
      break;
  }

}

// exports.formatDate = function(date) {
//     var d = date ? new Date(date) : new Date(),
//         month = '' + (d.getMonth() + 1),
//         day = '' + d.getDate(),
//         year = d.getFullYear();
//
//     if (month.length < 2) month = '0' + month;
//     if (day.length < 2) day = '0' + day;
//
//     return [year, month, day].join('');
// }
exports.dbDateToStr = function(date) {
  var year = date.slice(0, 4),
      month = date.slice(5, 7),
      day = date.slice(8, 10);
  return [year, month, day].join('');
}
exports.dateToStr = function(date) {
  var d = date ? new Date(date) : new Date(),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('');
}
