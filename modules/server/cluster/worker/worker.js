var workerServer = require('./worker_server');
// var WebSocket = require('ws');
var userDB = require('./worker_server/db').user;

var publicModule = require('../../../public');
var pub = null, clients = {};
var userOnLobbyList = [];
var isServerDown = false;
// var os 	= require('os-utils');

var restrictGame = false;

exports.initWorker = function(port) {
  // setInterval(() => {
  //   os.cpuUsage(function(v){
  //     console.log( 'WCPU Usage (%): ' + v );
  //   });
  //   os.cpuFree(function(v){
  //     console.log( 'WCPU Free:' + v );
  //   });
  //   console.log('Wfree memory (%)' + os.freememPercentage());
  // }, 10000);

  var server = workerServer.server.createServer();
  workerServer.redis.initRedis(redisMessageHandler);
  pub = workerServer.redis.getPublisher();
  workerServer.socket.initSocket(server, socketMessageHandler);

  clients = workerServer.socket.getClients();
  server.listen(port);

  // process.send('Hello Master ' + process.pid);
  process.on('message', processMessageHandler);

  workerServer.socket.onClientJoin = function(client) {
    process.send({type: 'clientJoin', sid: client.sid });

    // sync database id with socket
    sendPacket(client, publicModule.encoder.encodePacketWithType(
      publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
      publicModule.config.MESSAGE_TYPE.SYNC_UID, process.pid + '' + client.sid));

    // client.send(publicModule.encoder.encodePacketWithType(
    //   publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
    //   publicModule.config.MESSAGE_TYPE.SYNC_UID, process.pid + '' + client.sid));

    // console.log('on client join socket id ' + client.sid);
  }
  workerServer.socket.onClientExit = function(client) {
    if (client.isOnPlayGame) {
      if (!client.isGameHost) {
        if (client.oppPid) {
          pub.publish(client.oppPid, 'gameOver,' + client.oppSid);
        } else {
          console.log('pid is null onClientExit');
        }
      }
      client.gameOver(false);
      // if (client.uid) {
      //   // calc rating
      //   console.log('client exit');
      //   var newRating = client.oppRating - 1;
      //   userDB.findById(client.uid, (err, result) => {
      //       userDB.updateUserMultiData(client.uid, 'pvpLoseCount', result.pvpLoseCount + 1,
      //                                              'rating', newRating);
      //       // userDB.updateUserData(client.uid, 'pvpLoseCount', result.pvpLoseCount + 1);
      //     });
      //   // userDB.findUserData(client.uid, 'pvpLoseCount', (err, result) => {
      //   //     userDB.updateUserData(client.uid, 'pvpLoseCount', result + 1);
      //   //   });
      // }
    }
    process.send({type: 'clientExit', sid: client.sid, uid: client.uid });
  }
  workerServer.socket.onNeedCommu = function(oppSid, oppPid, dataType, type, data, mySid) {
    if (oppPid !== process.pid) {
      if (dataType == publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY) {
        if (data) {
          var arrayToString = data.toString();
          var sendData = 'sendData,' + oppSid + ',' + dataType + ',' + type + ',' + arrayToString;
        } else {
          sendData = 'sendData,' + oppSid + ',' + dataType + ',' + type;
        }
      } else {
        sendData = 'sendData,' + oppSid + ',' + dataType + ',' + type + ',' + data;
      }
      if (oppPid) {
        pub.publish(oppPid, sendData);
      } else {
        console.log('pid is null onNeedCommu');
        console.log(sendData);
      }
    } else {
      if (clients[oppSid]) {
        // clients[oppSid].send(publicModule.encoder.encodePacketWithType(
        //   dataType, type, data));
        sendPacket(clients[oppSid], publicModule.encoder.encodePacketWithType(
          dataType, type, data));
        if (type == publicModule.config.MESSAGE_TYPE.EXPLODE_GEMS && clients[oppSid].isGameHost) {
          clients[oppSid].addScore(data, false);
        } else if (type == publicModule.config.MESSAGE_TYPE.EXPLODE_GEM_BY_SKILL && clients[oppSid].isGameHost) {
          clients[oppSid].addScoreBySkill(data, false);
        } else if (type == publicModule.config.MESSAGE_TYPE.GAME_OVER) {
          var isWin = data[0] == 1 ? true : false;
          clients[oppSid].gameOver(isWin);
        } else if (type == publicModule.config.MESSAGE_TYPE.GAME_CANCELED) {
          clients[oppSid].gameCanceled();
        }
      } else {
        console.log('can`t find oppenent');
      }
    }

    if (mySid) {
      if (clients[mySid]) {
        // clients[mySid].send(publicModule.encoder.encodePacketWithType(
        //   dataType, type, data));
        sendPacket(clients[mySid], publicModule.encoder.encodePacketWithType(
          dataType, type, data));
      }
    }
  }
  workerServer.socket.onNeedSelfCommu = function(mySid, dataType, type, data) {
    if (clients[mySid]) {
      // clients[mySid].send(publicModule.encoder.encodePacketWithType(
      //   dataType, type, data));
      sendPacket(clients[mySid], publicModule.encoder.encodePacketWithType(
        dataType, type, data));
    }
  }
  workerServer.socket.onClientStartGame = function(client) {
    if (client.oppPid !== process.pid) {
      if (client.oppPid) {
        pub.publish(client.oppPid, 'startGameTimer,' + client.oppSid + ',' + client.skill);
      } else {
        console.log('pid is null onClientStartGame');
      }
    } else {
      if (clients[client.oppSid]) {
        clients[client.oppSid].startGameTimer();
        sendPacket(clients[client.oppSid], publicModule.encoder.encodePacketWithType(
          publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
          publicModule.config.MESSAGE_TYPE.SYNC_SKILL,
          [client.skill]));
      }
    }
    // sync skill
    sendPacket(client, publicModule.encoder.encodePacketWithType(
      publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
      publicModule.config.MESSAGE_TYPE.SYNC_SKILL,
      [client.oppSkill]));
    // if (oppPid !== process.pid) {
    //   if (oppPid) {
    //     pub.publish(oppPid, 'startGameTimer,' + oppSid + ',' + skill);
    //   } else {
    //     console.log('pid is null onClientStartGame');
    //   }
    // } else {
    //   if (clients[oppSid]) {
    //     clients[oppSid].startGameTimer();
    //   }
    // }
  }
  workerServer.socket.onClientGameOver = function(client) {
    // if (client.oppPid !== process.pid) {
    if (client.oppPid) {
      pub.publish(client.oppPid, 'gameOver,' + client.oppSid);
    } else {
      console.log('pid is null onClientGameOver');
    }
      // if (client.uid) {
      //   // userDB.findUserData(client.uid, 'pvpLoseCount', (err, result) => {
      //   //     userDB.updateUserData(client.uid, 'pvpLoseCount', result + 1);
      //   //   });
      //   console.log('client game over');
      //   var newRating = client.oppRating - 1;
      //   userDB.findById(client.uid, (err, result) => {
      //       userDB.updateUserMultiData(client.uid, 'pvpLoseCount', result.pvpLoseCount + 1,
      //                                              'rating', newRating);
      //     });
      // }
    // }
  }

  // 16 + (1600 - 1700) x (16 / 400) = 12

  workerServer.socket.onNeedDbUpdate = function(type, client, var1) {
    if (client.uid) {
      switch (type) {
        case 'gameOver':
          var oppRating = client.oppRating ? client.oppRating : 1200;
          if (var1) {
            // win
            userDB.findById(client.uid, (err, result) => {
                var myRating = result.rating;
                var newRating = publicModule.publicFunctions.calcRating(myRating, oppRating, true);
                // var newRating = myRating + 16 + (oppRating - myRating) * (16 / 400);
                userDB.updateUserPVPGameData(result, true, newRating);
                // userDB.updateUserMultiData(client.uid, 'pvpWinCount', result.pvpWinCount + 1,
                //                                        'rating', newRating);
              });
          } else {
            // lose
            userDB.findById(client.uid, (err, result) => {
                var myRating = result.rating;
                var newRating = publicModule.publicFunctions.calcRating(myRating, oppRating, false);
                // var newRating = myRating - (16 + (myRating - oppRating) * (16 / 400));
                userDB.updateUserPVPGameData(result, false, newRating);
                // userDB.updateUserMultiData(client.uid, 'pvpLoseCount', result.pvpLoseCount + 1,
                //                                        'rating', newRating);
              });
          }
          break;
      }
    } else {
      console.log('cant find client uid : ' + type);
    }
  }
  workerServer.server.onReqSyncID = function(sid, uid, pid, name) {
    var data = 'syncID,' + sid + ',' + uid + ',' + name;

    process.send({ type: 'joinLobby', sid: sid, uid: uid, name: name });

    if (pid) {
      pub.publish(pid, data);
    } else {
      console.log('pid is null onReqSyncID');
    }
  }
}
function processMessageHandler(msg) {
  try {
    // console.log('on worker message: ' + msg);
    switch (msg.type) {
      case 'matchFound':
        var client = clients[msg.user.sid];
        if (client) {
          client.oppSid = msg.oppUser.sid;
          client.oppPid = msg.oppUser.pid;
          client.oppName = msg.oppUser.name;
          client.oppRating = msg.oppUser.rating;

          client.isGameHost = msg.isGameHost;
          // client.startGame();

          client.isOnMatching = false;
          client.isOnPlayGame = true;

          // client.send(publicModule.encoder.encodePacketWithType(
          //   publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
          //   publicModule.config.MESSAGE_TYPE.MATCH_FOUND));
          var stringData = client.oppName + ',' + client.oppRating;

          var uid = client.uid;
          exitLobby(uid);

          if (client.hasFocus) {
            sendPacket(client, publicModule.encoder.encodePacketWithType(
              publicModule.config.MESSAGE_DATA_TYPE.STRING,
              publicModule.config.MESSAGE_TYPE.MATCH_FOUND,
              stringData
            ));
            // sendPacket(client, publicModule.encoder.encodePacketWithType(
            //   publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
            //   publicModule.config.MESSAGE_TYPE.MATCH_FOUND));
          } else {
            sendPacket(client, publicModule.encoder.encodePacketWithType(
              publicModule.config.MESSAGE_DATA_TYPE.STRING,
              publicModule.config.MESSAGE_TYPE.MATCH_FOUND_ON_BLUR,
              stringData
            ));
          }
        }
        break;
      case 'matchCanceled':
        var client = clients[msg.sid];
        if (client) {
          client.isOnMatching = false;
          // client.send(publicModule.encoder.encodePacketWithType(
          //   publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
          //   publicModule.config.MESSAGE_TYPE.MATCH_CANCELED));
          sendPacket(client, publicModule.encoder.encodePacketWithType(
            publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
            publicModule.config.MESSAGE_TYPE.MATCH_CANCELED));
        }
        break;
      case 'joinLobby':
        userOnLobbyList.push({ uid: msg.uid, name: msg.name });

        for (var index in clients) {
          // check if duplicate
          if (clients[index].uid == msg.uid && clients[index].sid != msg.sid) {
            sendPacket(clients[index], publicModule.encoder.encodePacketWithType(
              publicModule.config.MESSAGE_DATA_TYPE.STRING,
              publicModule.config.MESSAGE_TYPE.DUPLICATE_JOIN
            ));
          } else if (!clients[index].isOnPlayGame) {
            sendPacket(clients[index], publicModule.encoder.encodePacketWithType(
              publicModule.config.MESSAGE_DATA_TYPE.STRING,
              publicModule.config.MESSAGE_TYPE.JOIN_LOBBY,
              msg.uid + ',' + msg.name
            ));
          }
        }
        break;
      case 'exitLobby':
        for (var i=0; i<userOnLobbyList.length; i++) {
          if (userOnLobbyList[i].uid == msg.uid) {
            userOnLobbyList.splice(i, 1);
            for (var index in clients) {
              if (!clients[index].isOnPlayGame) {
                sendPacket(clients[index], publicModule.encoder.encodePacketWithType(
                  publicModule.config.MESSAGE_DATA_TYPE.STRING,
                  publicModule.config.MESSAGE_TYPE.EXIT_LOBBY,
                  msg.uid
                ));
              }
            }
            break;
          }
        }
        break;
      case 'resetLobbyUsers':
        userOnLobbyList = msg.users;
        break;
      case 'restrictGame':
        restrictGame = true;
        break;
      case 'releaseRestrictGame':
        restrictGame = false;
        break;
      case 'instruction':
        switch (msg.subType) {
          case 'informToAll':
            for (var index in clients) {
              sendPacket(clients[index], publicModule.encoder.encodePacketWithType(
                publicModule.config.MESSAGE_DATA_TYPE.STRING,
                publicModule.config.MESSAGE_TYPE.INSTRUCTION,
                msg.msg
              ));
            }
            break;
          case 'serverDown':
            isServerDown = true;
            workerServer.server.serverDown();
            break;
          case 'serverDownCancel':
            isServerDown = false;
            workerServer.server.cancelServerDown();
            break;
        }
        break;
    }
  } catch (e) {
    var time = new Date();
    console.log('process message handler error : ' + time);
    console.log(msg);
    console.log(e);
  }
}
function redisMessageHandler(channel, strData) {
  try {
    // console.log('redis on message ' + channel + ' : ' + strData);
    if (channel == process.pid) {
      var datas = strData.split(',');
      var type = datas[0];
      switch (type) {
        case 'syncID':
          var sid = datas[1];
          var uid = datas[2];
          var name = datas[3];

          if (clients[sid]) {
            clients[sid].uid = uid;
            clients[sid].name = name;
            // clients[sid].send(publicModule.encoder.encodePacketWithType(
            //   publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            //   publicModule.config.MESSAGE_TYPE.SUCCESS_SYNC_UID));
            sendPacket(clients[sid], publicModule.encoder.encodePacketWithType(
              publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
              publicModule.config.MESSAGE_TYPE.SUCCESS_SYNC_UID));
          }
          break;
        case 'sendData':
          var sid = datas[1];
          var dataType = datas[2];
          var packetType = datas[3];
          if (dataType == publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY) {
            var data = [];
            for (var i=4; i<datas.length; i++) {
              data.push(datas[i]);
            }
          } else {
            data = datas[4];
          }
          if (clients[sid]) {
            // clients[sid].send(publicModule.encoder.encodePacketWithType(
            //   dataType, packetType, data));
            sendPacket(clients[sid], publicModule.encoder.encodePacketWithType(
              dataType, packetType, data));
            if (packetType == publicModule.config.MESSAGE_TYPE.EXPLODE_GEMS && clients[sid].isGameHost) {
              clients[sid].addScore(data, false);
            } else if (packetType == publicModule.config.MESSAGE_TYPE.EXPLODE_GEM_BY_SKILL && clients[sid].isGameHost) {
              clients[sid].addScoreBySkill(data, false);
            } else if (packetType == publicModule.config.MESSAGE_TYPE.GAME_OVER) {
              var isWin = data[0] == 1 ? true : false;
              clients[sid].gameOver(isWin);
            } else if (packetType == publicModule.config.MESSAGE_TYPE.GAME_CANCELED) {
              clients[sid].gameCanceled();
            }
          }
          break;
        case 'readyForGame':
          var sid = datas[1];
          var skill = datas[2];
          if (clients[sid]) {
            clients[sid].onReadyOpp(skill);
          }
          break;
        // case 'syncSkill':
        //   var sid = datas[1];
        //   var skill = datas[2];
        //   if (clients[sid]) {
        //     sendPacket(clients[sid], publicModule.encoder.encodePacketWithType(
        //       publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
        //       publicModule.config.MESSAGE_TYPE.SYNC_SKILL,
        //       [skill]));
        //   }
        //   break;
        case 'reqGemsInfo':
          var sid = datas[1];
          if (clients[sid]) {
            // clients[sid].send(publicModule.encoder.encodePacketWithType(
            //   publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            //   publicModule.config.MESSAGE_TYPE.REQ_GEMS_INFO));
            sendPacket(clients[sid], publicModule.encoder.encodePacketWithType(
              publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
              publicModule.config.MESSAGE_TYPE.REQ_GEMS_INFO));
          }
          break;
        case 'startGameTimer':
          var sid = datas[1];
          var skill = datas[2];
          if (clients[sid]) {
            clients[sid].startGameTimer();
            sendPacket(clients[sid], publicModule.encoder.encodePacketWithType(
              publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
              publicModule.config.MESSAGE_TYPE.SYNC_SKILL,
              [skill]));
          }
          break;
        case 'useSkill':
          var sid = datas[1];
          if (clients[sid]) {
            clients[sid].useSkill(false);
          }
          break;
        case 'checkOppIsAlive':
          var sid = datas[1];
          var oppPid = datas[2];
          var oppSid = datas[3];
          if (!clients[sid]) {
            if (oppPid) {
              pub.publish(oppPid, 'oppIsDead,' + oppSid);
            } else {
              console.log('pid is null checkOppIsAlive');
            }
          }
          break;
        case 'oppIsDead':
          var sid = datas[1];
          if (clients[sid]) {
            clients[sid].oppIsDead();
          }
          break;
        case 'gameOver':
          var sid = datas[1];
          if (clients[sid]) {
            clients[sid].gameOver(true);
            // var client = clients[sid];
            // if (client.uid) {
            //   // userDB.findUserData(clients[sid].uid, 'pvpWinCount', (err, result) => {
            //   //   userDB.updateUserData(client.uid, 'pvpWinCount', result + 1);
            //   // });
            //   console.log('game over win the game');
            //   var newRating = client.oppRating + 2;
            //   userDB.findById(client.uid, (err, result) => {
            //       userDB.updateUserMultiData(client.uid, 'pvpWinCount', result.pvpWinCount + 1,
            //                                              'rating', newRating);
            //     });
            // }
          }
          break;
        case 'chatOnGame':
          var sid = datas[1];
          if (clients[sid]) {
            var jsonData = '';
            for (var i=2; i<datas.length; i++) {
              if (i === datas.length - 1) {
                jsonData += datas[i];
              } else {
                jsonData += datas[i] + ',';
              }
            }
            var data = JSON.parse(jsonData);
            var buffer = publicModule.encoder.encodePacket(data.dataType, data.data);
            sendPacket(clients[sid], buffer);
          }
          break;
      }
    } else {
      var data = JSON.parse(strData);

      switch (data.type) {
        case publicModule.config.MESSAGE_TYPE.CHAT_TO_ALL:
          var buffer = publicModule.encoder.encodePacket(data.dataType, data.data);
          if (buffer) {
            for (var index in clients) {
              // clients[index].send(buffer);
              sendPacket(clients[index], buffer);
            }
          }
          break;
        case publicModule.config.MESSAGE_TYPE.CHAT_TO_ROOM:
          break;
        case publicModule.config.MESSAGE_TYPE.CHAT_ON_LOBBY:
        var buffer = publicModule.encoder.encodePacket(data.dataType, data.data);
        if (buffer) {
          for (var index in clients) {
            if (!clients[index].isOnPlayGame) {
              sendPacket(clients[index], buffer);
            }
            // clients[index].send(buffer);
          }
        }
          break;
        default:
          console.log('cant find type[redis onmessage]');
      }
    }
  } catch (e) {
    var time = new Date();
    console.log('redis message handler error : ' + time);
    console.log(channel + ' : ' + strData);
    console.log(e);
  }
}

function socketMessageHandler(packet) {
  // this == socket client
  // console.log('on socket message : ' + packet);
  try {
    var data = publicModule.encoder.decodePacket(packet, true);
    switch (data.type) {
      case publicModule.config.MESSAGE_TYPE.CHAT_TO_SELF:
        // this.send(packet);
        sendPacket(this, packet);
        break;
      case publicModule.config.MESSAGE_TYPE.FIND_MATCH:
        if (restrictGame) {
          sendPacket(this, publicModule.encoder.encodePacketWithType(
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.HIGH_RESOURCE_USAGE, [1]));
        } else if (isServerDown) {
          sendPacket(this, publicModule.encoder.encodePacketWithType(
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.HIGH_RESOURCE_USAGE, [3]));
        } else if (!this.isOnMatching && !this.isOnPlayGame) {
          this.isOnMatching = true;
          var self = this;
          workerServer.server.getUserData(self.uid, (err, user) => {
            if (user) {
              process.send({type: 'findMatch', sid: self.sid, name: user.displayName, rating: user.rating });
            } else {
              // redirect to '/'
              // self.send(publicModule.encoder.encodePacketWithType(
              //   publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
              //   publicModule.config.MESSAGE_TYPE.GOTO_MAIN));
              sendPacket(self, publicModule.encoder.encodePacketWithType(
                publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
                publicModule.config.MESSAGE_TYPE.GOTO_ERROR));
            }
          });
        }
        break;
      case publicModule.config.MESSAGE_TYPE.CANCEL_MATCH:
        if (this.isOnPlayGame) {
          console.log('already start game');
        } else if (this.isOnMatching) {
          process.send({type: 'cancelMatch', sid: this.sid });
        }
        break;
      case publicModule.config.MESSAGE_TYPE.READY_FOR_GAME:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        // this.startCheckGameStartTimer();
        if (!this.isGameHost) {
          if (this.oppPid) {
            pub.publish(this.oppPid, 'readyForGame,' + this.oppSid + ',' + dataAsArray[0]);
          } else {
            console.log('pid is null READY_FOR_GAME');
          }
        } else {
          // if (this.oppPid) {
          //   pub.publish(this.oppPid, 'syncSkill,' + this.oppSid + ',' + dataAsArray[0]);
          // } else {
          //   console.log('pid is null READY_FOR_GAME, syncSkill');
          // }
          this.readyForGame(dataAsArray[0]);
        }
        break;
      case publicModule.config.MESSAGE_TYPE.MOVE_MAIN_GEM:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        this.commuWithOpp(data.dataType, data.type, dataAsArray);
        // pub.publish(this.oppPid, 'moveMainGem,' + this.oppSid + ',' + data.data[2] + data.data[3]);
        break;
      case publicModule.config.MESSAGE_TYPE.DROP_GEMS:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        this.commuWithOpp(data.dataType, data.type, dataAsArray);
        this.updateTime();
        break;
      case publicModule.config.MESSAGE_TYPE.EXPLODE_GEMS:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        this.commuWithOpp(data.dataType, data.type, dataAsArray);
        if (this.oppPid) {
          pub.publish(this.oppPid, 'checkOppIsAlive,' + this.oppSid + ',' + process.pid + ',' + this.sid);
        } else {
          console.log('pid is null EXPLODE_GEMS');
        }
        if (this.isGameHost) {
          this.addScore(dataAsArray, true);
        }
        break;
      case publicModule.config.MESSAGE_TYPE.USE_SKILL:
        if (this.isGameHost) {
          this.useSkill(true);
        } else {
          pub.publish(this.oppPid, 'useSkill,' + this.oppSid);
        }
        // this.commuWithOpp(data.dataType, data.type, [0]);
        break;
      case publicModule.config.MESSAGE_TYPE.EXPLODE_GEM_BY_SKILL:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        this.commuWithOpp(data.dataType, data.type, dataAsArray);
        if (this.isGameHost) {
          this.addScoreBySkill(dataAsArray, true);
        }
        break;
      case publicModule.config.MESSAGE_TYPE.GEM_ADD_SCORE:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        this.commuWithOpp(data.dataType, data.type, dataAsArray);
        break;
      case publicModule.config.MESSAGE_TYPE.REQ_GEMS_INFO:
        if (this.oppPid) {
          pub.publish(this.oppPid, 'reqGemsInfo,' + this.oppSid);
        } else {
          console.log('pid is null REQ_GEMS_INFO');
        }
        break;
      case publicModule.config.MESSAGE_TYPE.RES_GEMS_INFO:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        this.commuWithOpp(data.dataType, data.type, dataAsArray);
        break;
      case publicModule.config.MESSAGE_TYPE.REMOVE_IMMORTAL_GEM:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        this.commuWithOpp(data.dataType, data.type, dataAsArray);
        break;
      case publicModule.config.MESSAGE_TYPE.GAME_OVER:
        if (this.oppPid) {
          pub.publish(this.oppPid, 'gameOver,' + this.oppSid);
        } else {
          console.log('pid is null GAME_OVER');
        }
        // if (this.uid) {
        //   var self = this;
        //   // userDB.findUserData(this.uid, 'pvpLoseCount', (err, result) => {
        //   //     userDB.updateUserData(self.uid, 'pvpLoseCount', result + 1);
        //   //   });
        //   console.log('game over on message');
        //   var newRating = client.oppRating - 1;
        //   userDB.findById(self.uid, (err, result) => {
        //       userDB.updateUserMultiData(self.uid, 'pvpLoseCount', result.pvpLoseCount + 1,
        //                                            'rating', newRating);
        //     });
        // }
        this.gameOver(false);
        break;
      case publicModule.config.MESSAGE_TYPE.QUIT_GAME:
        if (this.oppPid) {
          pub.publish(this.oppPid, 'gameOver,' + this.oppSid);
        } else {
          console.log('pid is null QUIT_GAME');
        }
        this.gameOver(false);
        break;
      case publicModule.config.MESSAGE_TYPE.RESET_IDS:
        // var dataAsArray = publicModule.encoder.decodePacketData(packet);
        this.commuWithOpp(data.dataType, data.type);
        break;
      case publicModule.config.MESSAGE_TYPE.CHECK_SYNC_UID:
        if (this.uid) {
          // this.send(publicModule.encoder.encodePacketWithType(publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
          //   publicModule.config.MESSAGE_TYPE.SUCCESS_SYNC_UID));
          sendPacket(this, publicModule.encoder.encodePacketWithType(publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
            publicModule.config.MESSAGE_TYPE.SUCCESS_SYNC_UID));
        } else {
          var self = this;
          setTimeout(() => {
            if (self.uid) {
              sendPacket(this, publicModule.encoder.encodePacketWithType(publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
                publicModule.config.MESSAGE_TYPE.SUCCESS_SYNC_UID));
            } else {
              sendPacket(this, publicModule.encoder.encodePacketWithType(publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
                publicModule.config.MESSAGE_TYPE.FAIL_TO_SYNC_UID));
            }
          }, 1000);
          // this.send(publicModule.encoder.encodePacketWithType(publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
          //   publicModule.config.MESSAGE_TYPE.FAIL_TO_SYNC_UID));
        }
        break;
      case publicModule.config.MESSAGE_TYPE.PLAY_SOLO:
        if (this.uid) {
          var uid = this.uid;
          exitLobby(uid);
          userDB.findUserData(uid, 'playSoloCount', (err, result) => {
            userDB.updateUserData(uid, 'playSoloCount', result + 1);
          });
        }
        break;
      case publicModule.config.MESSAGE_TYPE.PLAY_PVC:
        if (this.uid) {
          var uid = this.uid;
          exitLobby(uid);
          userDB.findUserData(uid, 'playPvcCount', (err, result) => {
            userDB.updateUserData(uid, 'playPvcCount', result + 1);
          });
        }
        break;
      case publicModule.config.MESSAGE_TYPE.REQ_RESYNC_UID:
        sendPacket(this, publicModule.encoder.encodePacketWithType(
          publicModule.config.MESSAGE_DATA_TYPE.INTEGER,
          publicModule.config.MESSAGE_TYPE.SYNC_UID, process.pid + '' + this.sid));
        break;
      case publicModule.config.MESSAGE_TYPE.ON_FOCUS:
        this.hasFocus = true;
        break;
      case publicModule.config.MESSAGE_TYPE.ON_BLUR:
        this.hasFocus = false;
        break;
      case publicModule.config.MESSAGE_TYPE.SOLO_GAME_OVER:
        var packetData = publicModule.encoder.decodePacketData(packet);
        // console.log(packetData);
        var score = Math.floor(packetData / 100000);
        // var rest = packetData % 100000;
        // var level = Math.floor(rest / 1000);
        // var combo = rest % 1000;
        // console.log(score + ' : ' + level + ' : ' + combo);
        userDB.updateSoloGameScore(this.uid, score);
        break;
      case publicModule.config.MESSAGE_TYPE.PVC_WIN_GAME:
        var dataAsArray = publicModule.encoder.decodePacketData(packet);
        userDB.updatePVCClearDiff(this.uid, dataAsArray[0]);
        break;
      case publicModule.config.MESSAGE_TYPE.JOIN_LOBBY:
        var uid = this.uid;
        var sid = this.sid;
        var name = this.name;
        if (uid && name) {
          process.send({ type: 'joinLobby', sid: sid, uid: uid, name: name });
        }
        break;
      case publicModule.config.MESSAGE_TYPE.REQ_USERS_ON_LOBBY:
        var data = userOnLobbyList.length;
        for (var i=0; i<userOnLobbyList.length; i++) {
          data += ',' + userOnLobbyList[i].uid + ',' + userOnLobbyList[i].name;
        }
        sendPacket(this, publicModule.encoder.encodePacketWithType(
          publicModule.config.MESSAGE_DATA_TYPE.STRING,
          publicModule.config.MESSAGE_TYPE.REQ_USERS_ON_LOBBY,
          data));

        // // delete this
        // var temp = publicModule.encoder.encodePacketWithType(
        //   publicModule.config.MESSAGE_DATA_TYPE.STRING,
        //   publicModule.config.MESSAGE_TYPE.REQ_USERS_ON_LOBBY,
        //   data);
        // console.log('userOnLobbyList packet length : ' + (temp.length));

        break;
      case publicModule.config.MESSAGE_TYPE.CHAT_ON_LOBBY:
        if (restrictGame) {
          sendPacket(this, publicModule.encoder.encodePacketWithType(
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.HIGH_RESOURCE_USAGE, [2]));
        } else if (isServerDown) {
          sendPacket(this, publicModule.encoder.encodePacketWithType(
            publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicModule.config.MESSAGE_TYPE.HIGH_RESOURCE_USAGE, [3]));
        } else {
          this.checkChatTime();
          if (!this.blockChatTimeout) {
            pub.publish('global', JSON.stringify(data));
          }
        }
        break;
      case publicModule.config.MESSAGE_TYPE.CHAT_ON_GAME:
        this.checkChatTime();
        if (!this.blockChatTimeout && this.oppPid) {
          pub.publish(this.oppPid, 'chatOnGame,' + this.oppSid + ',' + JSON.stringify(data));
          // pub.publish(this.oppPid, JSON.stringify(data));
        }
        break;
      case publicModule.config.MESSAGE_TYPE.LEAVE_GAME:
        this.commuWithOpp(data.dataType, data.type, false, true);
        this.initGameVars();
        break;
      case publicModule.config.MESSAGE_TYPE.INSTRUCTION:
        // chat instruction
        // var data = publicModule.encoder.decodePacket(packet, true);
        var packetData = publicModule.encoder.decodePacket(packet);
        var datas = packetData.split(',');
        var instruction = datas[1].split(' ');
        if (instruction[0] == '/ADMM') {
          switch (instruction[1]) {
            case 'Inform_To_All':
              var msg = '';
              for (var i=2; i<instruction.length; i++) {
                msg += instruction[i] + ' ';
              }
              process.send({ type: 'instruction', subType: 'informToAll', msg: msg });
              break;
            case 'Server_Down':
              process.send({ type: 'instruction', subType: 'serverDown' });
              break;
            case 'Server_Down_Cancel':
              process.send({ type: 'instruction', subType: 'serverDownCancel' });
              break;
          }
        }
        break;
      default:
        pub.publish('global', JSON.stringify(data));
    }
  } catch (e) {
    var time = new Date();
    console.log('socket message handler error : ' + time);
    console.log(packet);
    console.log(e);
  }
}

function sendPacket(client, msg) {
  try {
    if (client.readyState === 1 && msg.length < 2048) {
      client.send(msg, (err) => {
        if (err) {
          console.log(err);
        }
      });
    } else if (msg.length >= 2048) {
      console.log('packet size is too large : ' + client.uid + ' : ' +  msg.length);
    }
  } catch (e) {
    var time = new Date();
    console.log('send packet error : ' + time);
    console.log(msg);
    console.log(e);
    // client.close();
  }
}

function exitLobby(uid) {
  if (uid) {
    process.send({ type: 'exitLobby', uid: uid });
  }
}
