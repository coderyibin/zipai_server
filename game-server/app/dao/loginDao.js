/**
 * Created by xieyq on 2017/6/13.
 */
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var util = require("util");
var utils = require('../util/utils');
var loginDao = module.exports;
var pomelo = require("pomelo");

//添加房卡以日 为单位的消耗记录
loginDao.insertLogin = function(userID,time){
    var sql = "insert into login (userid,login_time) values (?,?)";
    var args = [userID,time];
    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err){
            logger.error('loginDao/insertLogin err : ' + err.message);
            utils.invokeCallback(cb,err, null);
        } else {
            logger.info("loginDao insertLogin && success:\n" + JSON.stringify(res) );
        }
    });
}

//添加房卡以日 为单位的消耗记录
loginDao.insertExit= function(userID,loginTime){
    var nowDate = new Date(Date.now());
    var dateNowStr = utils.timestampToDate(nowDate);

    var sql = "update login set exit_time = ? where login_time = ? and userid = ?";
    var args = [dateNowStr,loginTime,userID];
    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err){
            logger.error('loginDao/insertExit err : ' + err.message);
            utils.invokeCallback(cb,err, null);
        } else {
            logger.info("loginDao/ insertExit && success:\n" + JSON.stringify(res) );
        }
    });
}
