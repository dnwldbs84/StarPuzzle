var serverModule = require('./modules/server');

var cluster = require('cluster'); // Only required if you want the worker id
// var sticky = require('sticky-session');
var port = process.env.PORT || 80;

// no cluster
// var server = serverModule.server.createServer();
// serverModule.worker.initWorker(server);
// server.listen(port, function() {
//   console.log('server running at %d', port);
// });

// sticky session
// var app = serverModule.server.initServer();
// var server = require('http').createServer(app);

// if (!sticky.listen(server, port)) {
//   // Master code
//   server.once('listening', function() {
//     serverModule.master.initMaster(cluster);
//     console.log('server started on %d port', port);
//   });
// } else {
//   // Worker code
//   serverModule.worker.initWorker(server);
// }

// only use cluster
cluster.schedulingPolicy = cluster.SCHED_RR;

if(cluster.isMaster) {
  // var workerCount = process.env.WORKERS || require('os').cpus().length;
  // console.log('workers count : %d', workerCount);
  serverModule.cluster.master.initMaster(cluster);
  // serverModule.master.initMaster(cluster);
  // for (var i=0; i<workerCount; i++) {
  //   var worker = cluster.fork();
  //   console.log('worker %s started.', worker.process.pid);
  // }
} else {
  // var server = serverModule.cluster.server.createServer();
  // var server = serverModule.server.createServer();
  // var server = require('http').createServer(app);
  // serverModule.worker.initWorker(server);
  // server.listen(port);
  serverModule.cluster.worker.worker.initWorker(port);
}

// serverModule.cluster.worker.worker.initWorker(port);
