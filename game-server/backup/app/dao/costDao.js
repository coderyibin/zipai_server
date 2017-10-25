/**
 * Created by xieyq on 2017/6/13.
 */
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var util = require("util");
var utils = require('../util/utils');
var costDao = module.exports;
var pomelo = require("pomelo");

//添加房卡消耗记录
costDao.insertCostCard = function(userID,costCard,cb){
    var sql = "insert into cost (userid,costcard,time) values(?,?,?)";
    var tempDate =  utils.timestampToDate(Date.now());
    var args = [userID,costCard,tempDate];

    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err){
            logger.error('mailDao err : ' + err.message);
            utils.invokeCallback(cb,err, null);
        } else {
            logger.info("mailDao getMainInfo && success:\n" + JSON.stringify(res) );
            if(res.insertId > 0){
                utils.invokeCallback(cb, null, true);
            } else {
                utils.invokeCallback(cb, null, false);
            }
        }
    });
}