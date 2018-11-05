// var workers = process.env.WORKERS || require('os').cpus().length;
var os 	= require('os-utils');
var memory = {};
if (process.platform === 'linux') {
  var spawn = require("child_process").spawn;
  var prc = spawn("free", []);

  prc.stdout.setEncoding("utf8");
  prc.stdout.on("data", function (data) {
    // var lines = data.toString().split(/\n/g),
    //     line = lines[1].split(/\s+/),
    //     total = parseInt(line[1], 10),
    //     free = parseInt(line[3], 10),
    //     buffers = parseInt(line[5], 10),
    //     cached = parseInt(line[6], 10),
    //     actualFree = free + buffers + cached,
    //     memory = {
    //         total: total,
    //         used: parseInt(line[2], 10),
    //         free: free,
    //         shared: parseInt(line[4], 10),
    //         buffers: buffers,
    //         cached: cached,
    //         actualFree: actualFree,
    //         percentUsed: parseFloat(((1 - (actualFree / total)) * 100).toFixed(2)),
    //         comparePercentUsed: ((1 - (os.freemem() / os.totalmem())) * 100).toFixed(2)
    //     };
    // console.log("memory", memory);
    var lines = data.toString().split(/\n/g),
        line = lines[1].split(/\s+/),
        total = parseInt(line[1], 10),
        free = parseInt(line[3], 10),
        buffers = parseInt(line[5], 10),
        cached = parseInt(line[6], 10),
        // buff_cache = parseInt(line[5], 10),
        // available = parseInt(line[6], 10),
        // actualFree = free + buff_cache;
        actualFree = free + buffers + cached;

    memory = {
        // total: total,
        // used: parseInt(line[2], 10),
        // free: free,
        // shared: parseInt(line[4], 10),
        // buffers: buffers,
        // cached: cached,
        // // buff_cache: buff_cache,
        // // available: available,
        // actualFree: actualFree,
        percentFree: parseFloat((actualFree / total).toFixed(2))
    };
  });

  prc.on("error", function (error) {
      console.log("[ERROR] Free memory process", error);
  });
}
var userList = {},
    userOnMatchList = [],
    workers = {},
    userOnLobbyList = [];

var MIN_DIFF_RATING_FOR_MATCHING = 20, MAX_DIFF_RATING_FOR_MATCHING = 200;
var RESTRICT_FREE_CPU = 0.15, RESTRICT_FREE_MEMORY = 0.15;
var restrictGame = false;

exports.initMaster = function(cluster) {
  var date = new Date();
  console.log('Master start at ' + date);

  setInterval(() => {
    // os.cpuUsage(function(v){
    //   console.log( 'CPU Usage (%): ' + v );
    // });

    os.cpuFree(function(freeCpu){
      if (process.platform === 'linux') {
        spawn("free", []);
        var freeMemory = memory.percentFree;
        // console.log(memory);
      } else {
        freeMemory = os.freememPercentage();
      }
      if (freeCpu < RESTRICT_FREE_CPU || freeMemory < RESTRICT_FREE_MEMORY) {
        console.log('RESTRICT GAME !!!');
        console.log('CPU Free:' + freeCpu);
        console.log('free memory (%)' + freeMemory);
        // if (!restrictGame) {
        restrictGame = true;
        for (var index in workers) {
          workers[index].send({type: 'restrictGame'});
        }
        // }
      } else if (restrictGame) {
        restrictGame = false;
        for (var index in workers) {
          workers[index].send({type: 'releaseRestrictGame'});
        }
      }
    });
  }, 15 * 1000);

  console.log('start cluster');

  var workerCount = process.env.WORKERS || os.cpuCount();
  // require('os').cpus().length;
  console.log('workers count : %d', workerCount);

  for (var i=0; i<workerCount; i++) {
    var worker = cluster.fork();
    workers[worker.process.pid] = worker;
    userList[worker.process.pid] = [];
    console.log('worker %s started.', worker.process.pid);
    // userOnMatchList[worker.process.pid] = [];
  }
  cluster.on('message', clusterMessageHandler);

  cluster.on('exit', function(deadWorker, code, signal) {
    console.log('worker %s died', deadWorker.process.pid);
    var newWorker = cluster.fork();

    workers[newWorker.process.pid] = newWorker;
    delete workers[deadWorker.process.pid];

    // var deadWorkerUserList = userList[deadWorker.process.pid];
    delete userList[deadWorker.process.pid];
    userList[newWorker.process.pid] = [];
    // userList[newWorker.process.pid] = deadWorkerUserList;

    for (var i=userOnMatchList.length - 1; i>=0; i--) {
      if (userOnMatchList[i].pid === deadWorker.process.pid) {
        userOnMatchList.splice(i, 1);
        // userOnMatchList[i].pid = newWorker.process.pid;
      }
    }
    newWorker.send({ type: 'resetLobbyUsers', users: userOnLobbyList });
    var date = new Date();
    console.log('Worker restart at ' + date);
  });

  // find match every one sec;
  var findMatchInterval = setInterval(findMatch, 1000);
}

function clusterMessageHandler(worker, msg) {
  // console.log('Master onmessage ' + msg);
  switch (msg.type) {
    case 'clientJoin':
      userList[worker.process.pid].push(msg.sid);
      console.log('clientJoin');
      console.log(userList);
      break;
    case 'clientExit':
      var index = userList[worker.process.pid].indexOf(msg.sid);
      if (index >= 0) {
        userList[worker.process.pid].splice(index, 1);
      }
      for (var i=0; i<userOnMatchList.length; i++) {
        if (userOnMatchList[i].sid === msg.sid && userOnMatchList[i].pid === worker.process.pid) {
          userOnMatchList.splice(i, 1);
          break;
        }
      }
      removeOnLobby(msg.uid);
      console.log('clientExit');
      console.log(userList);
      break;
    case 'findMatch':
      // var index = userOnMatchList[worker.process.pid].indexOf(msg.id);
      // if (index === -1) {
      // console.log('findMatch : ' + msg.sid);
      userOnMatchList.push({ sid: msg.sid, pid: worker.process.pid, name: msg.name, rating: msg.rating,
                             ratingDiff: MIN_DIFF_RATING_FOR_MATCHING, isMatch: false });
      // }
      break;
    case 'cancelMatch':
      for (var i=0; userOnMatchList.length; i++) {
        if (userOnMatchList[i].sid === msg.sid && userOnMatchList[i].pid === worker.process.pid &&
          !userOnMatchList[i].isMatch) {
          userOnMatchList.splice(i, 1);
          worker.send({type: 'matchCanceled', sid: msg.sid });
          break;
        }
      }
      break;
    case 'joinLobby':
      // use when worker dead
      userOnLobbyList.push({ uid: msg.uid, name: msg.name });
      for (var index in workers) {
        workers[index].send(msg);
      }
      break;
    case 'exitLobby':
      removeOnLobby(msg.uid);
      // for (var i=0; i<userOnLobbyList.length; i++) {
      //   if (userOnLobbyList[i].uid == msg.uid) {
      //     userOnLobbyList.splice(i, 1);
      //     for (var index in workers) {
      //       workers[index].send(msg);
      //     }
      //     break;
      //   }
      // }
      break;
    case 'instruction':
      for (var index in workers) {
        workers[index].send(msg);
      }
      break;
  }
}

function findMatch() {
  // find match users
  for (var i=0; i<userOnMatchList.length - 1; i++) {
    var curUser = userOnMatchList[i];
    if (!curUser.isMatch){
      for (var j=i+1; j<userOnMatchList.length; j++) {
        var oppenentUser = userOnMatchList[j];
        if (!oppenentUser.isMatch && Math.abs(curUser.rating - oppenentUser.rating) < curUser.ratingDiff){
          curUser.isMatch = true;
          oppenentUser.isMatch = true;
          var curUserWorker = workers[curUser.pid];
          var oppUserWorker = workers[oppenentUser.pid];
          process.nextTick(() => {
              curUserWorker.send({ type: 'matchFound', user: curUser, oppUser: oppenentUser, isGameHost: true });
              oppUserWorker.send({ type: 'matchFound', user: oppenentUser, oppUser: curUser, isGameHost: false });
            });
          break;
        }
      }
    }
  }

  // delete match user on match list
  for (var i=userOnMatchList.length-1; i>=0; i--) {
    if (userOnMatchList[i].isMatch) {
      userOnMatchList.splice(i, 1);
    } else if (userOnMatchList[i].ratingDiff < MAX_DIFF_RATING_FOR_MATCHING) {
      userOnMatchList[i].ratingDiff += 5;
      // need cancel match
    }
  }
}

function removeOnLobby(uid) {
  for (var i=0; i<userOnLobbyList.length; i++) {
    if (userOnLobbyList[i].uid == uid) {
      userOnLobbyList.splice(i, 1);
      console.log('exit lobby');
      console.log(uid);
      console.log(userOnLobbyList);
      for (var index in workers) {
        workers[index].send({ type: 'exitLobby', uid: uid });
      }
      break;
    }
  }
}
