/**
 * Created by xieyq on 2017/5/25.
 * 房间的管理
 */
var pomelo = require("pomelo");
var ClientNet = require("../../model/clientNet");
var roomLogger = require('pomelo-logger').getLogger('room', __filename, process.pid);
var roomDic = {};
var util = require("util");
var intervalId = null;
//添加房间
exports.addRoom = function(room){
    roomDic[room.roomId] = room;
    if(! intervalId){
        intervalId = setInterval(checkRelelase,120000);//120000
    }
};

//删除房间
exports.deleteRoom = function(roomId){
    delete  roomDic[roomId];
}

//遍历所有房间看是否需要解散的
function checkRelelase(){
    var room;
    for (var roomId in roomDic) {
        room = roomDic[roomId];
        if ((Date.now() - room.actTime) > 3600000) {  //3600000
            roomLogger.info("one hour no action to be out room checkRelelase "+ room.roomId);
           if(room.gameStatus != "over"){
               room.instertResultSql();
           }
            room.destory();
            /*var sessionService = pomelo.app.get('sessionService');
            var sessions = sessionService.getByUid(uid);
            if( !! sessions) {
                var l = sessions.length;
                for(i=0; i<l; i++) {
                    sessions[i].set("roomId",null);
                }
            }*/
            pomelo.app.rpc.chat.chatRemote.delChannel(null,room.roomId,function() {

            });
            //解散房间进入主界面
            for(var i = 0;i < room.userList.length;i ++) {
                ClientNet.enterMainRoom(room.userList[i],room.channelService);
            }
            var channel = room.channelService.getChannel(room.roomId, false);
            ClientNet.destoryChannel(channel);
            delete  roomDic[roomId];
        }
    }
}


exports.getRoomDic = function(){
    return  roomDic;
}



