/**
 * Created by xieyq on 2017/4/5.
 * gd指令
 */
var Code = require("../../../util/code");
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService =  this.app.get('channelService');
}
var handler = Handler.prototype;

//游戏开始，获取棋牌信息
handler.getRoomCardInfo = function (msg, session, next) {
    var roomId = session.get("roomId");
    if(! roomId) {
        next(null, {
                code: Code.FIGHT.NO_ROOM_ID
            });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if (!! channel && !! channel.room && !! channel.room.card) {
        var obj = {};
        obj["remainCard"] = channel.room.card.remainCard;
        obj["currentCard"] = channel.room.currCardId;
        obj["userList"] =  channel.room.userList;
    }
    next(null, {
        code: Code.OK,
        data: obj
    });
}