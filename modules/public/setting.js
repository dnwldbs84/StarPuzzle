var publicModule = require('../public');

exports.initMessageType = function() {
  var msgDataType = publicModule.config.MESSAGE_DATA_TYPE;
  for (var index in msgDataType) {
    msgDataType[index] = String.fromCharCode(msgDataType[index]);
  }
  var msgType = publicModule.config.MESSAGE_TYPE;
  for (var index in msgType) {
    msgType[index] = String.fromCharCode(msgType[index]);
  }
}
