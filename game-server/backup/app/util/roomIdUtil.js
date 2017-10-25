/**
 * Created by xieyq on 2017/5/4.
 * 房间ID生成工具
 */
var roomIdData = {};
//四位数房间
var MAX_ROOM_ID = 10000;
module.exports.createRoomID = function() {
    var roomId = 0;
    var randomId = parseInt(MAX_ROOM_ID * Math.random());
    var roomStrLength = String(randomId).length;
    var roomStr = "";
    if(roomStrLength < 4) {
        for(var i = roomStrLength ;i < 4 ;i ++) {
            roomStr += "0";
        }
    }
    roomStr += String(randomId);
    randomId = roomStr;
    if(!! roomIdData.hasOwnProperty(randomId)) {
        roomId = this.createRoomID();
    } else {
        roomId = randomId;
        roomIdData[roomId] = 1;
    }
    return roomId;
}

module.exports.deleteRoomID = function(roomId) {
    delete roomIdData[roomId];
}

