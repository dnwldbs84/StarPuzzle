// var mysql = require('mysql');
// replace to file
var setting = {
  socketPath : '/var/run/mysqld/mysqld.sock',
  host: 'localhost',
  user: '',
  password: '',
  database: 'world',

  dateStrings: 'date'
};

exports.connect = function(mysql) {
  var fs = require('fs');
  var text = fs.readFileSync('setting.txt');
  var datas = text.split(',');
  setting.user = datas[0];
  setting.password = datas[1];

  conn = mysql.createConnection(setting);
  conn.connect();
  return conn;
}
