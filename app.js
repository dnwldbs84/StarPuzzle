var serverModule = require('./modules/server');

var cluster = require('cluster');
var port = process.env.PORT || 80;

// only use cluster
cluster.schedulingPolicy = cluster.SCHED_RR;

if(cluster.isMaster) {
  serverModule.cluster.master.initMaster(cluster);
} else {
  serverModule.cluster.worker.worker.initWorker(port);
}
