/**
 * Created by xieyq on 2017/5/3.
 *  战绩接口
 */
var Code = require("../../../util/code");
var resultDao = require("../../../dao/resultDao");
var GameConst = require("../../../util/gameConstant");
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService =  this.app.get('channelService');

}
var handler = Handler.prototype;

//返回房间每一局的战绩
handler.requestEachResult = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
                code: Code.FIGHT.NO_ROOM_ID
            });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    var gameRoom = channel.room;
    next(null, {
            code: Code.OK,
            data: gameRoom.eachFightResult
        });
}



//可以放入game服务器中
//返回玩家总的战绩  。取一次先放内存中
handler.requestFightHistory = function(msg,session,next) {
    var globalChannel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = globalChannel.userMap[session.uid];
    var startIndex = parseInt(msg.startIndex);
    var num = parseInt(msg.num);
    resultDao.getMonthResults(player.uid,startIndex,num,function(err,params) {
        if(!! err) {
               console.log("get reulst error");
            next(null, {
                    code: Code.FAIL,
                    msg: "get resultHistory failed"
                });
        } else {
            next(null, {
                    code: Code.OK,
                    data: params
                });
        }
    });
}