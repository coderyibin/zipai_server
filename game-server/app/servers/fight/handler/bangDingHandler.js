/**
 * Created by xieyq on 2017/5/13.
 */
var Code = require("../../../util/code");
var userDao = require("../../../dao/userDao");
var roleMgr = require("../../../domain/mgr/roleMgr");
var GameConst = require("../../../util/gameConstant");
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var ClientNet = require('../../../model/clientNet');
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService =  this.app.get('channelService');
}

var handler = Handler.prototype;

//游戏开始，获取棋牌信息
//wechatID:  phoneNo:
handler.requestBangDing = function (msg, session, next) {
    var uid = session.uid;
    var channel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = channel.userMap[uid];
    var self = this;
    if(!! msg.wechatID && !! msg.phoneNo &&! player.phoneNo && ! player.wechatID) {
        userDao.update({phoneNo:msg.phoneNo, wechatID:msg.wechatID},uid,function(err,result){
            if(!! err) {
                logger.error("bangding error" + uid);
                next(null,{
                    code:Code.FAIL
                });
            } else {
                if(result){
                    next(null, {
                        code: Code.OK,
                        uid: session.uid,
                        phoneNo: msg.phoneNo,
                        wechatID: msg.wechatID
                    });
                    roleMgr.updateUserInfo(session,uid,{phoneNo:msg.phoneNo, wechatID:msg.wechatID,roomCard:player.fightCardCount+parseInt(2)},true);
                    userDao.update({fightCardCount:player.fightCardCount+parseInt(2)},player.uid);
                } else {
                    next(null,{
                        code:Code.FAIL
                    });
                }
            }
        });
    }
    else {
        next(null,{
            code:Code.BANG_DING_INFO_NONE,
            msg: "bangding info none"
        });
        ClientNet.msgTip(player.uid,player.sid,GameConst.LANGUAGE.BANGDING_INFO_NONE,this.channelService)
    }
}
