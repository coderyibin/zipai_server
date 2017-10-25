/**
 * Created by xieyq on 2017/6/16.
 */
var GameConst = require("../../util/gameConstant");
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var util =require("util");
var roomLogger = require('pomelo-logger').getLogger('room', __filename, process.pid);
var exp = module.exports;
var intervalId = null;
var Code = require("../../util/code");
var roomMgr = require('./roomMgr');
var roleMgr = require('./roleMgr');
var onlineDao = require('../../dao/onLineDao');
var Sign = require("../../domain/sign");
var request = require("request");
var publicWebTicket = {};
module.exports.init = function (){
    if(! intervalId){
        intervalId = setInterval(inserToSql,60000);//60000
    }
}

//设置公众号的Ticket方法及过期时间  时间以秒为单位
module.exports.getPWebTickt = function(callback){
    var mustRequst = false;
    if(! publicWebTicket.hasOwnProperty("ticket")){
        mustRequst = true;
    }
    if(! mustRequst){
        var nowDate = Date.now()/1000;
        if((nowDate - publicWebTicket["time"]) >  publicWebTicket["expireTime"]){
            mustRequst = true;
        }
    }
    var toUrl = "http://zp.xunlegame.com/wxshare.html";//GameConst.DATA.PUBLIC_WEB_URL;
    if(mustRequst){
        var requestTime = Date.now()/1000;
        var publicAppID = GameConst.DATA.PUBLIC_APPID;
        var publicAppSecret  = GameConst.DATA.PUBLIC_SECRET;
        var getAccesTokenUrl =  "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + publicAppID + "&secret="+ publicAppSecret;
        roomLogger.info("to request accessTokenUrl:" + getAccesTokenUrl);
        request(getAccesTokenUrl,function(error,response,body) {
            roomLogger.info("request accessTokenUrl result:" + util.inspect(body));
            if (error) {
                roomLogger.error("request accessTokenUrl Error" + error);
                utils.invokeCallback(callback,Code.FAIL);
            } else {
                body = JSON.parse(body);
                var accessToken = body["access_token"];
                var expireTime= body["expires_in"];
                publicWebTicket["token"] = accessToken;
                publicWebTicket["time"] = requestTime;
                publicWebTicket["expireTime"] = expireTime;
                var getTiketUrl = " https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=" + accessToken + "&type=jsapi";
                request(getTiketUrl,function(ticketError,ticketResponse,ticketBody) {
                    roomLogger.info("request getTiketUrl result:" + util.inspect(ticketBody));
                    if (ticketError) {
                        roomLogger.error("request getTiketUrl Error" + error);
                        utils.invokeCallback(callback,Code.FAIL);
                    } else {
                        ticketBody = JSON.parse(ticketBody);
                        var ticketExpiresTime = ticketBody["expires_in"];
                        publicWebTicket["expireTime"] = ticketExpiresTime;
                        if(parseInt(ticketBody["errcode"]) != 0){
                            utils.invokeCallback(callback,Code.FAIL);
                        } else{
                            var ticket = ticketBody["ticket"];
                            publicWebTicket["ticket"] = ticket;
                            var returnData = Sign(ticket, toUrl);
                            utils.invokeCallback(callback,Code.OK,returnData);
                        }
                    }
                });
            }
        });
    } else {
        var returnData = Sign(publicWebTicket["ticket"], toUrl);
        utils.invokeCallback(callback,Code.OK,returnData);
    }
}



var inserToSql = function(){
   var  roomDic = roomMgr.getRoomDic();
    var onlinePlayer = roleMgr.getRoleDicCount();
    var roleDic = roleMgr.getRoleDic();
    var maxPlayers = roleMgr.getRoleMaxCount();
    var fightRoom = 0;
    var readyRoom = 0;
    for(var roomProp in roomDic){
        if(!! roomDic[roomProp]){
            if(roomDic[roomProp].status == "fight"){
                fightRoom++;
            } else {
                readyRoom++;
            }
        }
    }
    var uidNameStr = "";
   for(var uid in roleDic){
       uidNameStr += "  " + uid + "-" + roleDic[uid].name;
    }
    if(!! uidNameStr){
        roomLogger.info("curr online player "+ uidNameStr);
    }
    roleMgr.resetMaxCount();
    onlineDao.insertOnLineDate(onlinePlayer,fightRoom,readyRoom,maxPlayers);
}



