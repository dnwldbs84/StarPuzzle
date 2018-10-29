var WebSocket = require('ws');
var game = require('./game').game;
var publicModule = require('../../../../public');

var clients = {};

var checkUpdateTimer = 2000, maxUpdateDelay = 10000;

var chatTimer = 1000, chatBlockCount = 5, chatBlockTime = 600000;

exports.onClientJoin = new Function();
exports.onClientExit = new Function();
exports.onClientStartGame = new Function();
exports.onClientGameOver = new Function();
exports.onNeedCommu = new Function();
exports.onNeedDbUpdate = new Function();

exports.initSocket = function(server, cb) {
  var wss = new WebSocket.Server({ server: server, perMessageDeflate: false });

  wss.on('connection', function(client) {
    console.log('client connect at ' + process.pid);
    client.curGame = null;

    client.sid = generateRandomUniqueID();
    client.uid = null;
    client.name = null;

    client.hasFocus = true;

    client.lastChatTime = Date.now();
    client.chatCount = 0;
    client.blockChatTimeout = false;

    client.isOnMatching = false;
    client.isOnPlayGame = false;
    client.isReadyForGame = false;

    client.isGameHost = false;

    client.skill = 1;
    client.oppSkill = 1;
    // sid;
    client.oppSid = null;
    client.oppPid = null;
    client.oppName = '';
    client.oppRating = 1200;
    client.oppDeadCheckCount = 0;
    client.isOppReadyForGame = false;
    client.lastUpdateTime = Date.now();

    client.checkIsStartGameInterval = false;
    client.checkIsStartGameCount = 0;

    clients[client.sid] = client;
    // clients.push(client);
    exports.onClientJoin(client);

    client.isAlive = true;
    client.on('pong', heartbeat);

    client.on('message', cb);
    client.on('error', function(err) {
      // client.close();
    });
    client.on('close', function(code, reason) {
      if (reason) {
        console.log('on socket close');
        console.log(code);
        console.log(reason);
      }
      exports.onClientExit(client);
      delete clients[client.sid];
      // var index = clients.indexOf(client);
      // if (index !== -1) {
      //   clients.splice(index);
      // }
    });
    // client.startGame = function() {
    //   this.isReadyForGame = false;
    // }
    client.checkChatTime = function() {
      if (Date.now() - client.lastChatTime < chatTimer) {
        client.chatCount += 1;
        if (client.chatCount > chatBlockCount) {
          if (client.blockChatTimeout) {
            clearTimeout(client.blockChatTimeout);
            client.blockChatTimeout = false;
          }
          client.blockChatTimeout = setTimeout(() => {
            client.chatCount = 0;
            clearTimeout(client.blockChatTimeout);
            client.blockChatTimeout = false;
          }, chatBlockTime);
        }
      } else {
        client.chatCount = 0;
      }
      client.lastChatTime = Date.now();
    }
    client.readyForGame = function(skill) {
      console.log('i am ready');
      if (!client.checkIsStartGameInterval) {
        client.startCheckGameStartTimer();
      }
      client.isReadyForGame = true;
      client.skill = skill;

      if (client.isOppReadyForGame) {
        client.startGame();
      }
    }
    client.onReadyOpp = function(skill) {
      console.log('opp is ready');
      if (!client.checkIsStartGameInterval) {
        client.startCheckGameStartTimer();
      }
      client.isOppReadyForGame = true;
      client.oppSkill = skill;
      if (client.isReadyForGame) {
        client.startGame();
      }
    }
    client.startGame = function() {
      if (!client.checkIsStartGameInterval) {
        // game already canceled
      } else {
        client.curGame = game.makeGameInstance(client.pid, client.sid, client.oppPid, client.oppSid);
        client.curGame.onNeedInformGameData = function(dataType, type, data) {
          exports.onNeedCommu(client.oppSid, client.oppPid,
            dataType, type, data, client.sid);
          }
          client.curGame.onGameOverByOverGem = function(isHostLose) {
            console.log('gameOverByOverGem');
            if (isHostLose) {
              client.gameOver(false);
            } else {
              client.gameOver(true);
            }
          }
          client.curGame.setSkill(this.skill, this.oppSkill);

          client.makeInitGem();

          client.curGame.makeStandbyGem();
          client.curGame.dropStandbyGem();

          client.startGameTimer();
          exports.onClientStartGame(client);
          // exports.onClientStartGame(client.oppPid, client.oppSid, client.skill, client.oppSkill);
      }
    }
    client.startCheckGameStartTimer = function() {
      var self = client;
      client.checkIsStartGameInterval = setInterval(() => {
        self.checkIsStartGameCount++;
        // console.log(self.checkIsStartGameCount);
        if (self.checkIsStartGameCount > 10) {
          // game canceled
          console.log('cancel game');
          exports.onNeedCommu(self.oppSid, self.oppPid,
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.GAME_CANCELED);
          exports.onNeedSelfCommu(self.sid,
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.GAME_CANCELED);

          clearInterval(self.checkIsStartGameInterval);
          self.checkIsStartGameInterval = false;
          self.checkIsStartGameCount = 0;

          if (self.curGame) {
            self.curGame.gameOver();
          }

          self.initGameVars();
        }
      }, 1000);
    }
    client.startGameTimer = function() {
      // clear checkIsStartGame interval
      clearInterval(client.checkIsStartGameInterval);
      client.checkIsStartGameInterval = false;
      client.checkIsStartGameCount = 0;

      client.lastUpdateTime = Date.now();
      client.lastUpdateInteval = setInterval(() => {
        if (Date.now() - client.lastUpdateTime > maxUpdateDelay) {
          // close socket??
          // defeat game
          // if (client.isGameHost) {
          // } else {
          if (!client.isGameHost) {
            exports.onClientGameOver(client);
          }
          client.gameOver(false);
          // }
        }
      }, checkUpdateTimer);
    }
    client.updateTime = function() {
      client.lastUpdateTime = Date.now();
    }
    client.makeInitGem = function() {
      var initGem = game.getInitGems(client.curGame.level);
      exports.onNeedCommu(client.oppSid, client.oppPid,
        publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
        publicModule.config.MESSAGE_TYPE.SET_INIT_GEM,
        initGem, client.sid);
    }
    client.commuWithOpp = function(dataType, type, data, isOnGame) {
      // int array
      if (client.isOnPlayGame) {
        exports.onNeedCommu(client.oppSid, client.oppPid,
          dataType, type, data);
      }
      if (isOnGame) {
        exports.onNeedCommu(client.oppSid, client.oppPid,
          dataType, type, data);
      }
    }
    client.addScore = function(data, isGameHost) {
      var comboCount = parseInt(data[0]);
      var isDanger = parseInt(data[1]);
      var matchCount = data.length - 2;
      var additionalScore = publicModule.publicFunctions.calcScore(matchCount, comboCount, isDanger);
      // var additionalScore = matchCount * 25 + 10 * (comboCount + 1);

      client.curGame.addScore(additionalScore, true, isGameHost);
      client.curGame.explodeGems(matchCount, isGameHost);
    }
    client.addScoreBySkill = function(data, isGameHost) {
      var explodeCount = data.length - 1;
      var additionalScore = publicModule.publicFunctions.calcSkillScore(explodeCount);

      client.curGame.addScore(additionalScore);
      client.curGame.explodeGems(explodeCount + 1, isGameHost);
    }
    client.useSkill = function(isGameHost) {
      var skillCheck = client.curGame.useSkill(isGameHost);
      // console.log('skill level 2? : ' + skillCheck.isLevel2);
      // send packet to both users
      if (skillCheck.canUse) {
        var data = skillCheck.isLevel2 ? 1 : 0;
        if (isGameHost) {
          exports.onNeedCommu(this.oppSid, this.oppPid,
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.USE_SKILL,
            [data]);
          exports.onNeedSelfCommu(this.sid,
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.USE_SKILL2,
            [data]);
        } else {
          exports.onNeedCommu(this.oppSid, this.oppPid,
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.USE_SKILL2,
            [data]);
          exports.onNeedSelfCommu(this.sid,
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.USE_SKILL,
            [data]);
        }
      } else {
        console.log('error on use skill');
      }
    }
    client.oppIsDead = function() {
      client.oppDeadCheckCount++;
      if (client.oppDeadCheckCount > 2) {
        // db update
        // exports.onNeedDbUpdate('winGame', client);

        if (!client.isGameHost) {
          // send win packet
          exports.onNeedSelfCommu(client.sid,
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.GAME_OVER,
            [1]);
        }
        // gameOver
        client.gameOver(true);
      }
    }
    client.gameCanceled = function() {
      client.initGameVars();
    }
    client.gameOver = function(isWin) {
      if (client.isGameHost) {
        if ((client.curGame && !client.curGame.isGameOver) || !client.curGame) {
          if (isWin) {
            exports.onNeedCommu(client.oppSid, client.oppPid,
              publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
              publicModule.config.MESSAGE_TYPE.GAME_OVER,
              [2]);
            exports.onNeedSelfCommu(client.sid,
              publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
              publicModule.config.MESSAGE_TYPE.GAME_OVER,
              [1]);
          } else {
            exports.onNeedCommu(client.oppSid, client.oppPid,
              publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
              publicModule.config.MESSAGE_TYPE.GAME_OVER,
              [1]);
            exports.onNeedSelfCommu(client.sid,
              publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
              publicModule.config.MESSAGE_TYPE.GAME_OVER,
              [2]);
          }
        }
        if (client.curGame && !client.curGame.isGameOver) {
          client.curGame.gameOver();
        }
      }

      // update db
      if (client.isOnPlayGame) {
        exports.onNeedDbUpdate('gameOver', client, isWin);
      }
      client.isOnPlayGame = false;
      // if (client.isGameHost && client.curGame && !client.curGame.isGameOver) {
      //   client.curGame.gameOver();
      //   if (isWin) {
      //     exports.onNeedCommu(client.oppSid, client.oppPid,
      //       publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
      //       publicModule.config.MESSAGE_TYPE.GAME_OVER,
      //       [2]);
      //     exports.onNeedSelfCommu(client.sid,
      //       publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
      //       publicModule.config.MESSAGE_TYPE.GAME_OVER,
      //       [1]);
      //   } else {
      //     exports.onNeedCommu(client.oppSid, client.oppPid,
      //       publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
      //       publicModule.config.MESSAGE_TYPE.GAME_OVER,
      //       [1]);
      //     exports.onNeedSelfCommu(client.sid,
      //       publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
      //       publicModule.config.MESSAGE_TYPE.GAME_OVER,
      //       [2]);
      //   }
      // } else if (client.isGameHost && !client.curGame) {
      //   if (isWin) {
      //     exports.onNeedSelfCommu(client.sid,
      //       publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
      //       publicModule.config.MESSAGE_TYPE.GAME_OVER,
      //       [1]);
      //   } else {
      //     exports.onNeedSelfCommu(client.sid,
      //       publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
      //       publicModule.config.MESSAGE_TYPE.GAME_OVER,
      //       [2]);
      //   }
      // }

      // client.initGameVars();

      // client.isGameHost = false;
      //
      // // clear match vars;
      // clearInterval(client.lastUpdateInteval);
      // client.lastUpdateInteval = false;
      // clearInterval(client.checkIsStartGameInterval);
      // client.checkIsStartGameInterval = false;
      // client.checkIsStartGameCount = 0;
      //
      // client.isOnMatching = false;
      // client.isOnPlayGame = false;
      // client.isReadyForGame = false;
      // client.oppSid = null;
      // client.oppPid = null;
      // client.isOppReadyForGame = false;
      // client.curGame = null;
      // client.oppDeadCheckCount = 0;
    }
    client.initGameVars = function() {
      client.isGameHost = false;

      // clear match vars;
      clearInterval(client.lastUpdateInteval);
      client.lastUpdateInteval = false;
      clearInterval(client.checkIsStartGameInterval);
      client.checkIsStartGameInterval = false;
      client.checkIsStartGameCount = 0;

      client.isOnMatching = false;
      client.isOnPlayGame = false;
      client.isReadyForGame = false;
      client.oppSid = null;
      client.oppPid = null;
      client.isOppReadyForGame = false;
      client.curGame = null;
      client.oppDeadCheckCount = 0;
    }
  });

  function heartbeat() {
    this.isAlive = true;
  }

  var pingpongInterval = setInterval(function(){
    try {
      wss.clients.forEach(function(client){
        if(client.isAlive === false){
          console.log('ping timeout: %s', new Date());
          // console.log(new Date());
          return client.terminate();
        }
        client.isAlive = false;
        if(client.readyState === WebSocket.OPEN){
          client.ping();
        }
      });
    } catch (e) {
      console.log('pingpongInterval Error');
    }
  }, 30000);
}

exports.getClients = function() {
  return clients;
}

function generateRandomUniqueID() {
  var isUnique = false;
  while (!isUnique) {
    var id = '';
    for (var i=0; i<6; i++) {
      if (i === 0) {
        id += Math.floor(Math.random() * 9 + 1).toString(10);
      } else {
        id += Math.floor(Math.random() * 10).toString(10);
      }
    }
    if (!clients[id]) {
      isUnique = true;
    }
  }
  return id;
}
