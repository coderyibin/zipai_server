/**
 * Created by xieyq on 2017/6/6.
 */
var Code = require("../../../util/code");
var GameConst = require("../../../util/gameConstant");
var roleMgr = require("../../../domain/mgr/roleMgr");
var userDao = require("../../../dao/userDao");
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService =  this.app.get('channelService');
}

var handler = Handler.prototype;

handler.setHead = function(msg, session, next){
    var headIndex =msg.head;
    roleMgr.getUserInfo(session,session.uid,function(player){
        roleMgr.updateUserInfo(session,session.uid,{head:headIndex},true,function(player){
            userDao.update({headimgurl:headIndex},player.uid,function(err,params){
                next(null,{
                    code:200
                });
            });
        });
    });
}
