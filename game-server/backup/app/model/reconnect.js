/**
 * Created by xieyq on 2017/4/20.
 * 断线重连的数据处理
 */
var playersData = {};
var roomData = {};
//添加断线需要处理的玩家
module.exports.addPlayer = function (player,room) {
    playersData[player.uid] = player;
    roomData[room.roomId] = room;
}

module.exports.delPlayer = function (player,roomId) {
    delete  playersData[player.uid];
    delete  roomData[player.roomId];
}

//获取玩家掉线后需要还原的数据
module.exports.getPlayerData = function (uid) {
    if (!! playersData[uid]) {
        return playersData[uid];
    } else {
        return null;
    }
}

//获取玩家掉线后房间的数
module.exports.getRoomData = function (roomId) {
    if (!! roomData[roomId]) {
        return roomData[roomId];
    } else {
        return null;
    }
}
