/**
 * Created by xieyq on 2017/5/11.
 * 邮件管理 的
 */
var Code = require("../../../util/code");
var mailDao = require("../../../dao/mailDao");
var GameConst = require("../../../util/gameConstant");
var Code = require("../../../util/code");
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


//获取系统邮件
//start  开始搜索的指针 .从0开始计
// num
handler.getMailInfo = function (msg, session, next) {
    var start = msg.start;
    var num = msg.num;
   mailDao.getMailInfo(session.uid,start,num,function(err,params){
       if(! err) {
           next(null, {
               data: params,
               code: Code.OK
           });
       } else {
           next(null, {
               msg:"get failed",
               code: Code.FAIL
           });
       }
   });
}

//设置邮件为已读状态
handler.readMail = function (msg, session, next) {
    var id = msg.id;
    mailDao.readMail(id,function(err,params){
        if(! err) {
            next(null, {
                code: Code.OK
            });
        } else {
            next(null, {
                msg:"read failed",
                code: Code.FAIL
            });
        }
    });
}

//领取邮件的附件
handler.getMailAttach = function (msg, session, next) {
    var mailId = msg.id;
    mailDao.getMail(mailId,function(err,result){
         if(result.length < 1){
             next(null,{
                 code:Code.MAIL.NOT_HAVE_MAIL
             });
         } else {
             var resource = result[0].attach;
             var roomCard = resource["roomCard"];
             roleMgr.getUserInfo(session,session.uid,function(player){
                 var totalCard = player.fightCardCount+parseInt(roomCard);
                 roleMgr.updateUserInfo(session,session.uid,{roomCard:totalCard},true,function(player){
                     userDao.update({fightCardCount:totalCard},player.uid,function(err,result){

                     });
                     mailDao.getAttach(mailId,function(err,result){
                         if (!! err){
                             next(null,{
                                 msg:"getMailAttach failed",
                                 code: Code.FAIL
                             });
                         } else {
                             next(null,{
                                 code: Code.OK
                             });
                         }
                     });
                 });
             });
         }
    });

}