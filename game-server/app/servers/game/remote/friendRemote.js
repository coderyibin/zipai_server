/**
 * Created by xieyq on 2017/5/26.
 */
var pomelo =require("pomelo");
var friendMgr = require("../../../domain/mgr/friendMgr");
module.exports = function(app) {
    return new friendRemote(app);
};

var friendRemote = function(app) {
    this.app = app;
    this.channelService = app.get('channelService');
};
var remote = friendRemote.prototype;

remote.delInviteFriendMsg = function(uid,cb){
    friendMgr.delInviteDataFromFId(uid);
    if(cb){
        cb();
    }
}