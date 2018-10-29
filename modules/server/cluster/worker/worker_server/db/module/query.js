// var mysql = require('mysql');
var mysql = null;
exports.setMysql = function(sql) {
  mysql = sql;
}

exports.findData = function(conn, table, where, column, cb) {
  conn.query('SELECT * FROM ' + table + ' WHERE ' + where + '=' + column, function(err, result, field) {
    // if (err) throw err;
    if (err) {
      var time = new Date();
      var query = 'SELECT * FROM ' + table + ' WHERE ' + where + '=' + column;
      console.log('find data error : ' + time);
      console.log(query);
      console.log(err);
      cb(err);
    }
    if (result) {
      cb(err, result[0]);
    } else {
      cb(err, 0);
    }
    // return result[0];
  });
}
// exports.findColumnData = function(conn, col, table, id, cb) {
//   conn.query('SELECT ' + col + ' FROM ' + table + ' WHERE id=' + id, function(err, result, field) {
//     if (result) {
//       cb(err, result[0]);
//     } else {
//       cb(err, 0);
//     }
//   });
// }
exports.findLastID = function(conn, table, cb) {
  conn.query('SELECT id FROM ' + table + ' ORDER BY id DESC LIMIT 1', function(err, result, field) {
    if (err) {
      var time = new Date();
      var query = 'SELECT id FROM ' + table + ' ORDER BY id DESC LIMIT 1';
      console.log('find last id error : ' + time);
      console.log(query);
      console.log(err);
      cb(err);
    }
    // if (err) throw err;
    if (result[0]) {
      cb(err, result[0].id);
    } else {
      cb(err, 0);
    }
  })
}

exports.insertData = function(conn, table, data, cb) {
  var query = 'INSERT INTO ' + table + ' SET ?';
  var values = data;
  query = mysql.format(query, values);
  tryTransaction(conn, query, function(result) {
      if (cb) {
        cb(result);
      }
    });
}

exports.updateData = function(conn, table, id, col, colData, cb) {
  var query = 'UPDATE ' + table + ' SET ' + col + ' = ' + colData + ' WHERE id=' + id;
  tryTransaction(conn, query, function(result) {
      cb(result);
  });
}

exports.updateMultiData = function(conn, table, id, col1, colData1, col2, colData2, cb) {
  var query = 'UPDATE ' + table + ' SET ' + col1 + ' = ' + colData1 + ', ' + col2 + ' = ' + colData2 + ' WHERE id=' + id;
  tryTransaction(conn, query, function(result) {
      cb(result);
  });
}

exports.queryDirectly = function(conn, query, cb) {
  tryTransaction(conn, query, function(result) {
      cb(result);
  });
}

exports.deleteUser = function(conn, table, where, value, cb) {
  var query = 'DELETE FROM ' + table + ' WHERE ' + where + ' = ' + value;
  tryTransaction(conn, query, function(result) {
      if (cb) {
        cb(result);
      }
    });
}

function tryTransaction(conn, query, cb) {
  conn.beginTransaction(function (err) {
    try {
      if (err) { throw err; }
      else {
        conn.query(query, function(err, result) {
          if (err) {
            return conn.rollback(function() {
              try {
                throw err;
              } catch (e) {
                var time = new Date();
                console.log('rollback err1 : ' + time);
                console.log(query);
                console.error(e);
              }
              // throw err;
            });
          }

          conn.commit(function(err) {
            if (err) {
              return conn.rollback(function() {
                try {
                  throw err;
                } catch (e) {
                  var time = new Date();
                  console.log('rollback err2 : ' + time);
                  console.log(query);
                  console.error(e);
                }
                // throw err;
              });
            }
            cb(result);
          });
        });
      }
    } catch (e) {
      var time = new Date();
      console.log('transaction err : ' + time);
      console.log(query);
      console.log(e);
    }
  });
}
