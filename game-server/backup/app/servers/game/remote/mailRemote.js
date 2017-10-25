/**
 * Created by xieyq on 2017/5/26.
 */
var mailDao = require("../../../dao/mailDao");
var pomelo =require("pomelo");
module.exports = function(app) {
    return new MailRemote(app);
};

var MailRemote = function(app) {
    this.app = app;
    this.channelService = app.get('channelService');
};
var remote = MailRemote.prototype;

remote.checkHaveNewMail = function(player,sid,cb){
    mailDao.getUnreadMail(player.uid,function(err,result){
       if(result > 0){
           pomelo.app.channelService.pushMessageByUids('onMailMsg',{count:result} , [{
               uid : player.uid,
               sid : sid
           }]);
       }
        cb(result);
    });
}