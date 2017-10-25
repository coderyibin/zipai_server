/**
 * Created by xieyq on 2017/5/13.
 * //信息请求部分
 */
var Code = require("../../../util/code");
var userDao = require("../../../dao/userDao");
var GameConst = require("../../../util/gameConstant");
var util = require("util");
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService =  this.app.get('channelService');
}

var handler = Handler.prototype;


//供客户端获取玩家信息
handler.getUserInfo = function (msg, session, next) {
    var uid = msg.uid;
    var channel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = channel.userMap[uid];
    if (!! player) {
        next(null,{
            code:Code.OK,
            uid: player.uid,
            head: player.headimgurl,
            sex: player.sex,
            name: player.name,
            fightNum:player.fightNum,
            winNum:player.winNum,
            dianPaoNum:player.dianPaoNum,
            zimoNum:player.zimoNum
        });
    } else {
        userDao.getUserClientInfo(uid,function(err,params){
            next(null,{
                code:Code.OK,
                uid: params.uid,
                head: params.headimgurl,
                sex: params.sex,
                name: params.nickname,
                fightNum:params.fightNum,
                winNum:params.winNum,
                dianPaoNum:params.dianPaoNum,
                zimoNum:params.zimoNum
            });
        });
    }
}

//供客户端设置语音id
handler.setVoiceID = function (msg, session, next) {
    var voiceId = msg.voiceId;
    var uid = session.uid;
    var channel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = channel.userMap[uid];
    player.voiceId = voiceId;
    var roomChannel = this.channelService.getChannel(player.roomId,false);
    if(! roomChannel){
        next(null,{
            code:Code.ROOM.NO_ROOM_CHANNEL
        });
        return;
    }
    var room = roomChannel.room;
    var userList = room.userList;
    var params ={};
    for(var i = 0 ;i < userList.length;i ++) {
        if(userList[i].uid != player.uid) {
            params[userList[i].uid] = userList[i].voiceId;
            this.channelService.pushMessageByUids('onVoiceID',{uid:player.uid,voiceId:voiceId} , [{
                uid: userList[i].uid,
                sid: userList[i].sid
            }]);
        }
    }
    console.log("call back client setVoiceID" + util.inspect(params));
    next(null,params);
}