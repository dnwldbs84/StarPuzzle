var publicModule = require('../public');

var Encoder = require('text-encoding');
var textEncoder = new Encoder.TextEncoder();
var textDecoder = new Encoder.TextDecoder();

publicModule.setting.initMessageType();

// encode at server
// return binary buffer
exports.encodePacket = function(dataType, data) {
	if (dataType == publicModule.config.MESSAGE_DATA_TYPE.STRING) {
		return new Uint8Array(data.data);
	} else if (dataType == publicModule.config.MESSAGE_DATA_TYPE.INTEGER) {
		return new Uint8Array(JSON.parse('[' + data + ']'));
	} else if (dataType == publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY) {
		return new Uint8Array(data);
	}
	// if (data[0] == intToChar(publicModule.config.MESSAGE_DATA_TYPE.STRING)) {
	// 	return textEncoder.encode(data);
	// } else if (data[0] == intToChar(publicModule.config.MESSAGE_DATA_TYPE.INTEGER)) {
	// 	return new Uint8Array(data);
	// 	// var array = JSON.parse("[" + data + "]");
	// 	//
	// 	// var buffer = new Uint8Array(array.length);
	// 	// for (var i=0; i<array.length; i++) {
	// 	// 	buffer[i] = array[i];
	// 	// }
	// 	// return buffer;
	// }
}

// encode at client
// return binary buffer
// type of data should be string
exports.encodePacketWithType = function(type, name, data) {
  if (type == publicModule.config.MESSAGE_DATA_TYPE.STRING) {
    // case chat
    // return textEncoder.encode(publicModule.config.MESSAGE_DATA_TYPE.STRING + data);
		return textEncoder.encode(publicModule.config.MESSAGE_DATA_TYPE.STRING + name + data);
  } else if(type == publicModule.config.MESSAGE_DATA_TYPE.INTEGER) {
    // case int array
		if (data) {
			var buffer = new Uint8Array(data.length + 2);
			buffer[0] = charToInt(type);
			buffer[1] = charToInt(name);
			for(var i=2; i<buffer.length; i++) {
				buffer[i] = data.substr(i-2, 1);
			}
		} else {
			buffer = new Uint8Array(2);
			buffer[0] = charToInt(type);
			buffer[1] = charToInt(name);
		}
    return buffer;
  } else if (type == publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY) {
		if (data) {
			var buffer = new Uint8Array(data.length + 2);
			buffer[0] = charToInt(type);
			buffer[1] = charToInt(name);
			for(var i=2; i<buffer.length; i++) {
				buffer[i] = data[i-2];
			}
		} else {
			buffer = new Uint8Array(2);
			buffer[0] = charToInt(type);
			buffer[1] = charToInt(name);
		}
		return buffer;
	}
}

// client : return string
// server : return type and binary(string) or string(integer)
// redis automatically decode binary as string
exports.decodePacket = function(data, needType) {
  var array = new Uint8Array(data);
	if (needType) {
		var dataType = intToChar(array[0]);
		var type = intToChar(array[1]);
	}

  if (array[0] == charToInt(publicModule.config.MESSAGE_DATA_TYPE.STRING)) {
		if (needType) {
			return { type: type, dataType: dataType, data: data };
		} else {
			return textDecoder.decode(array);
		}
  } else if (array[0] == charToInt(publicModule.config.MESSAGE_DATA_TYPE.INTEGER)) {
		if (needType) {
			return { type: type, dataType: dataType, data: array.toString() };
		} else {
			return array.toString();
		}
  } else if (array[0] == charToInt(publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY)) {
		var dataArray = [];
		dataArray[0] = dataType;
		dataArray[1] = type;
		for (var i=2; i<array.length; i++) {
			dataArray[i] = array[i];
		}
		if (needType) {
			return { type: type, dataType: dataType, data: dataArray};
		} else {
			return dataArray;
		}
	}
}

exports.decodePacketData = function(data) {
	var array = new Uint8Array(data);

	if (array[0] !== charToInt(publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY)) {
		var returnVal = '';
		for (var i=2; i<array.length; i++) {
			returnVal += array[i];
		}
	}

	if (array[0] == charToInt(publicModule.config.MESSAGE_DATA_TYPE.STRING)) {
		return returnVal;
	} else if (array[0] == charToInt(publicModule.config.MESSAGE_DATA_TYPE.INTEGER)) {
		return parseInt(returnVal);
	} else if (array[0] == charToInt(publicModule.config.MESSAGE_DATA_TYPE.INT_ARRAY)) {
		returnVal = [];
		for (var i=2; i<array.length; i++) {
			returnVal[i-2] = array[i];
		}
		return returnVal;
	}
}

function intToChar(intData) {
  return String.fromCharCode(intData);
}
function charToInt(charData) {
  return charData.charCodeAt(0);
}
