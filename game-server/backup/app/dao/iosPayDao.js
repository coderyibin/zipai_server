/**
 * Created by xieyq on 2017/7/4.
 */
var utils = require('../util/utils');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('guilin', __filename);


var iosPayDao = module.exports;

//插入订单
iosPayDao.insertOrder = function(userId,params,cb){
    var sql = "insert into iospay (product_id,order_id,user_id,time,roomcard) values(?,?,?,?,?)";
    var time = utils.timestampToDate(parseInt(params["purchase_date_ms"]));
    var roomCard = 0;
    switch(params["product_id"]){
        case "zipai.one":
            roomCard = 1;
            break;
        case "zipai.ten":
            roomCard = 10;
            break;
        case "zipai.twenty":
            roomCard = 20;
            break;
    }
    var args = [params["product_id"],params["transaction_id"],userId,time,roomCard];

    pomelo.app.get('dbclient').query(sql, args, function(err,res){
        if(err !== null){
            logger.error("iospayDao insertOrder failed" +  err);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.info('iospayDao insertOrder success!' + JSON.stringify(res));
            utils.invokeCallback(cb, null,true);
        }
    });
}

//查询订单
iosPayDao.selectOrder = function(orderId,userId,cb){
    var sql = "select id from iospay where order_id = ?";
    var args = [orderId];

    pomelo.app.get('dbclient').query(sql, args, function(err,res){
        if(err !== null){
            logger.error("iosPayDao selectOrder failed" +  err);
            utils.invokeCallback(cb, err, null);
        } else {
            logger.info('iosPayDao selectOrder success!' + JSON.stringify(res));
            if(res.length > 0){
                utils.invokeCallback(cb, null,userId,true);
            } else {
                utils.invokeCallback(cb, null,userId,false);
            }
        }
    });
}