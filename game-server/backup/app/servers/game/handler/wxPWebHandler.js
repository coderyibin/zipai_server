/**
 * Created by xieyq on 2017/7/19.
 */
var roleMgr = require('../../../domain/mgr/roleMgr');
var gameMgr = require('../../../domain/mgr/gameMgr');
var Code = require("../../../util/code");
var util = require("util");
//微信公众平台网页端的的各种接口方法
module.exports = function(app)
{
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
};

/*"errcode":0,
 "errmsg":"ok",
 "ticket":"bxLdikRXVbTPdHSM05e5u5sUoXNKd8-41ZO3MhKoyN5OfkWITDGgnr2fwJ0m9E8NYzWKVZvdVtaUgWvsdshFKA",
 "expires_in":7200*/
// initWebticketSianal
Handler.prototype.getSignature = function(msg,session,next){
    roleMgr.getUserInfo(session,session.uid,function(roleData){
        if(! roleData.isPublicWeb){
            next(null,Code.FAIL);
        } else{
            gameMgr.getPWebTickt(function(code,params){
                console.log("wxPWebHandler getSignature" + util.inspect(params));
                next(null,{
                    code:code,
                    data:params
                });
            });
           /* var toUrl = "http://zp.xunlegame.com";
            var publicAppID = GameConst.DATA.PUBLIC_APPID;
            var publicAppSecret  = GameConst.DATA.PUBLIC_SECRET;
            var getAccesTokenUrl =  "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + publicAppID + "&secret="+ publicAppSecret;
            roomLogger.info("to request accessTokenUrl:" + getAccesTokenUrl);
            request(getAccesTokenUrl,function(error,response,body) {
                roomLogger.info("request accessTokenUrl result:" + util.inspect(body));
                if (error) {
                    roomLogger.error("request accessTokenUrl Error" + error);
                    next(null,Code.FAIL);
                } else {
                    body = JSON.parse(body);
                    var accessToken = body["access_token"];
                    var expireTime= body["expires_in"];
                    var getTiketUrl = " https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=" + accessToken + "&type=jsapi";
                    request(getTiketUrl,function(ticketError,ticketResponse,ticketBody) {
                        roomLogger.info("request getTiketUrl result:" + util.inspect(body));
                        if (ticketError) {
                            roomLogger.error("request getTiketUrl Error" + error);
                            next(null,Code.FAIL);
                        } else {
                            ticketBody = JSON.parse(ticketBody);
                            var ticketExpiresTime = ticketBody["expires_in"];
                            if(parseInt(ticketBody["errcode"]) != 0){
                                next(null,Code.FAIL);
                            } else{
                                var ticket = ticketBody["ticket"];
                                var returnData = Sign(ticket, toUrl);
                                next(null,{
                                    code:Code.OK,
                                    data:returnData
                                });
                            }
                        }
                    });
                }
            });*/

        }
    });
}