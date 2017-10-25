/**
 * Created by xieyq on 2017/6/13.
 */
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var util = require("util");
var utils = require('../util/utils');
var dayCostDao = module.exports;
var pomelo = require("pomelo");

//添加房卡以日 为单位的消耗记录
dayCostDao.insertDayCost = function(userID,costCard,cb){
    var nowDate = new Date(Date.now());
    var dateNowStr = utils.timestampToSimple(nowDate);
    var startTime = dateNowStr +" " + "00:00:00";
    var endTime = dateNowStr +" " + "23:59:59";

    var sql = "select id from daycost where userid = ? and time between ? and ?";
    var args = [userID,startTime,endTime];
    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err){
            logger.error('dayCostDao err : ' + err.message);
            utils.invokeCallback(cb,err, null);
        } else {
            logger.info("dayCostDao insertDayCost && success:\n" + JSON.stringify(res) );
            var tempDate =  utils.timestampToDate(Date.now());
            if(res.length < 1 ){
                sql = "insert into daycost (userid,costcard,time) values(?,?,?)";
                args = [userID,costCard,tempDate];
            } else {
                sql = "update daycost set costcard = costcard + ?,time = ? where id = ?";
                args = [costCard,tempDate,res[0].id];
            }
            pomelo.app.get('dbclient').insert(sql, args, function(err,res) {
                if(err){
                    logger.error('dayCostDao err : ' + err.message);
                    utils.invokeCallback(cb,err, null);
                } else {
                    utils.invokeCallback(cb, null, true);
                }
            });
        }
    });
}