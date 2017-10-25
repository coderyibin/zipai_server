var utils = require('../util/utils');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('guilin', __filename);


var wxpayDao = module.exports;


wxpayDao.createOrder = function(params,cb){
	var sql = "insert into wxpay(appid,mch_id,nonce_str,sign,openid,trade_type,bank_type,total_fee,cash_fee,transaction_id,out_trade_no,time_end) select ?,?,?,?,?,?,?,?,?,?,?,? from dual where not exists (select * from wxpay where transaction_id = ? and out_trade_no = ?)";

	var args = [params.appid,params.mch_id,params.nonce_str,params.sign,params.openid,params.trade_type,params.bank_type,params.total_fee,params.cash_fee,params.transaction_id,params.out_trade_no,params.time_end,params.transaction_id,params.out_trade_no];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("createOrder failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info("wxpayDao createOrder && successccccccccccxxc:\n" + res.insertId);
			utils.invokeCallback(cb, null,res.insertId);
		}
	});
}

wxpayDao.orderQuery = function(out_trade_no,cb){
	var sql = "select * from wxpay where out_trade_no = ?";
	var args = [out_trade_no];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("createOrder failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info('orderquery success!' + JSON.stringify(res));
			utils.invokeCallback(cb, null,res);
		}
	});

}


wxpayDao.updateUserID = function(userID,out_trade_no,fangKa,cb){
	var sql = "update wxpay set userID = ?,roomcard = ? where out_trade_no = ?";
	var args = [userID,fangKa,out_trade_no];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("wxpayDao updateUserID failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info('updateUserID success!' + JSON.stringify(res));
			utils.invokeCallback(cb, null,true);
		}
	});

}

wxpayDao.updateIsValid = function(out_trade_no,cb){
	var sql = "update wxpay set isValid = 1 where out_trade_no = ?";
	var args = [out_trade_no];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("wxpayDao updateUserID failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info('updateUserID success!' + JSON.stringify(res));
			utils.invokeCallback(cb, null,true);
		}
	});

}