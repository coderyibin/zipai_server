var logger = require('pomelo-logger').getLogger('guilin', __filename);
var utils = require('../util/utils');
var pomelo = require('pomelo');
var userDao = require('./userDao');
var roleMgr = require("../domain/mgr/roleMgr");

var redeemDao = module.exports;

/*
var createRedeemKey = function(){
	var str = "0123456789abcdefghijklmnopqrstuvwxyz";
	var key = '';

	for (var i = 0; i < 8; i++) {
		var index =  Math.floor(Math.random()*str.length);
		var c = str.substring(index,index+1);	
		key = key + '' + c;
	}

	console.log(key);

	return key;
}
*/


// 在数据库中生成兑换码 临时手动
// count : 生成兑换码个数
// times : 该兑换码使用次数
/*redeemDao.create = function(count,times,fightCard,batch,cb){
	for (var i = 0; i < count; i++) {
		var redeemKey =  createRedeemKey();
		var sql = 'insert ignore  into redeem(redeemKey,times,fightCard,batch) values(?,?,?,?)';
		var args = [redeemKey,times,fightCard,batch];

		pomelo.app.get('dbclient').query(sql, args, function(err,res){
			if(err !== null){
				logger.error("redeemDao.create failed" +  err);
				utils.invokeCallback(cb, err, null);
			} else {
				logger.info("redeemDao.create && success:\n" + res.insertId);
				if (res.insertId == 0) {
					logger.info("redeemDao.create && 0000:\n" + res.insertId);
					redeemDao.create(count,times);
				}
				utils.invokeCallback(cb, null,res.insertId);
			}
		});
	}

}*/

// 兑换码有效 将userID存入IDs ,并存入使用时间
redeemDao.updateRedeemKey = function(userId,redeemKey,userName,cb){
	var nowDate = Date.now();
	var dateStr = utils.timestampToDate(nowDate);
	var sql = "update redeem set times = times-1,IDs = concat(IDs,?,';'),usetime = ?,nickname = ? where redeemKey = ?";
	var args = [userId,dateStr,userName,redeemKey];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("redeemDao.create failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			if (!!res && res.affectedRows>0) {
				logger.info('update updateRedeemKey success!');
				utils.invokeCallback(cb,null,true);
			}else {
				logger.info('update updateRedeemKey failed!');
				utils.invokeCallback(cb,null,false);
			}
		}
	});
}

// 检测兑换码是否有效
redeemDao.check = function(userId,redeemKey,codeInit,userName,cb){
	var sql = 'select times,IDs,fightCard,binduid from redeem where redeemKey = ?';
	var args = [redeemKey];
	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("redeemDao.create failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			if (!!res && res.length === 1) {
				var rs = res[0];
				var IDs = rs.IDs;
				var times = rs.times;
				var fightCard = rs.fightCard;
				var type =rs.binduid;
				logger.info("redeemDao.check fightCard :::::::::" + JSON.stringify(rs));
				var isInitCode = (parseInt(type) != 0);
				if(isInitCode){
					//推广兑换码
					console.log(codeInit+"code inited" + (!! codeInit));
					if(!! codeInit){
						//玩家已经兑换过这种类型
						utils.invokeCallback(cb, null, {msg : '您已经兑换过该类型兑换码'});
						return;
					}
				}

				// 该用户已经兑换过
				var IDList = IDs.split(";");
				logger.info("IDList :::::" + IDList + " length :" + IDList.length);
				for (var i = 0; i < IDList.length; i++) {
					if(IDList[i] == userId){
						utils.invokeCallback(cb, null, {msg : '您已经兑换过该兑换码，不能重复兑换'});
						return;
					}
				}

				// 该兑换码 已经被兑换 没有使用次数了
				if(! isInitCode){
					if (times< 1) {
						utils.invokeCallback(cb, null, { msg :'该兑换码已经被他人使用，无法兑换'});
						return;
					}
				}

				// 可以兑换
				// 加对战卡 
				roleMgr.getUserInfo(null,userId,function(roleData){
					var fightCardCount = roleData.fightCardCount;
					if(isInitCode){
						var bindtime = Date.now();
						userDao.update({fightCardCount : (fightCardCount + fightCard),codeinit:redeemKey,bindtime:utils.timestampToDate(bindtime)}, userId);
						roleMgr.updateUserInfo(null,userId,{roomCard : (fightCardCount + fightCard),codeInit : redeemKey},true);
					} else {
						userDao.update({fightCardCount : (fightCardCount + fightCard)}, userId);
						redeemDao.updateRedeemKey(userId,redeemKey,userName);
						roleMgr.updateUserInfo(null,userId,{roomCard : (fightCardCount + fightCard)},true);
					}
					utils.invokeCallback(cb, null, {msg : '兑换成功',fightCard : fightCard});
				});
			} else {
				utils.invokeCallback(cb, null, {msg : '该兑换码不存在'});
			}
		}
	});
}