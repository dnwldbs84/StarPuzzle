// var mysql = require('mysql');
// replace to file
var setting = {
  socketPath : '/var/run/mysqld/mysqld.sock',
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'world',

  dateStrings: 'date'
};

exports.connect = function(mysql) {
  conn = mysql.createConnection(setting);
  conn.connect();
  return conn;
}
