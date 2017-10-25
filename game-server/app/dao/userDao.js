var utils = require('../util/utils');
var stringUtil = require('../util/stringUtil');
var pomelo = require('pomelo');
var friendDao = require('./friendDao');
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var util = require("util");
var async = require('async');
var SessionUtil = require("../util/sessionUtil");
var userDao = module.exports;

// -- "openid":"OPENID",  普通用户的标识，对当前开发者帐号唯一
// -- "nickname":"NICKNAME",  普通用户昵称
// -- "sex":1,  普通用户性别，1为男性，2为女性
// -- "province":"PROVINCE", 普通用户个人资料填写的省份
// -- "city":"CITY",普通用户个人资料填写的城市
// -- "country":"COUNTRY",国家，如中国为CN
// -- "headimgurl": "http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/0",用户头像，最后一个数值代表正方形头像大小（有0、46、64、96、132数值可选，0代表640*640正方形头像），用户没有头像时该项为空
// -- "privilege":[   用户特权信息，json数组，如微信沃卡用户为（chinaunicom）
// -- "PRIVILEGE1",
// -- "PRIVILEGE2"
// -- ],
// -- "unionid": " o6_bmasdasdsad6_2sgVt7hMZOPfL"  用户统一标识。针对一个微信开放平台帐号下的应用，同一用户的unionid是唯一的。

// 通过nickname 将用户插入表中
userDao.register = function(params,cb){
	params.openid =  params.openid ? params.openid : stringUtil.getRandomString();
	params.nickname = params.nickname ?  params.nickname :"";
	params.sex = params.sex ? params.sex : parseInt(Math.random()*2)+1;
	params.province = params.province ? params.province : "";
	params.city = params.city ? params.city : "";
	params.country =  params.country ? params.country : "";
	params.headimgurl =  params.headimgurl ? params.headimgurl : "";
	params.privilege =  params.privilege ? JSON.stringify(params.privilege) : "";
	params.unionid =params.unionid ? params.unionid : stringUtil.getRandomString();

	if(userDao.isDebugPlayer(params.openid)){
		userDao.getUserInfoByNickName(params.nickname,function(err,user){
			if(!!err) {
				logger.error('Get user for userDao failed! ' + err);
				utils.invokeCallback(cb, err, null);
				return
			}
			userDao.registerUser(user,params,cb);
		});
	} else {
		userDao.getUserInfoByOpenID(params.openid,params.unionid,function(err,user){
			if(!!err) {
				logger.error('Get user for userDao failed! ' + err);
				utils.invokeCallback(cb, err, null);
				return
			}
			userDao.registerUser(user,params,cb);
		});
	}
}

userDao.registerUser = function(user,params,cb) {
	var sql;
	var args;
	var nowDate = utils.timestampToDate(Date.now());
	if(! params.unionid){
		//微信公众平台登陆需要
		params.unionid = "empty";
	}
	var reg = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
	var tempNickName = params.nickname;
	params.nickname =tempNickName.replace(reg,"");
	if(! user){
		sql = 'insert into user (openid,nickname,sex,province,city,country,headimgurl,privilege,unionid,fightCardCount,lastLoginDate,registerDate,registerIP) values(?,?,?,?,?,?,?,?,?,?,?,?,?)';
		args = [params.openid,params.nickname,params.sex,params.province,params.city,params.country,params.headimgurl,params.privilege,params.unionid,1,nowDate,nowDate,params.ipAddress];
	} else {
		if(userDao.isDebugPlayer(user.openid)){
			sql = 'update user set lastLoginDate = ? where nickname = ?';
			args = [nowDate,params.nickname];
		} else {
			sql = 'update user set nickname = ?,sex = ?,province = ?,city = ?,country = ?,headimgurl = ?,lastLoginDate = ?,openid = ? where (openid = ? or unionid = ?)';
			args = [params.nickname,params.sex,params.province,params.city,params.country,params.headimgurl,nowDate,params.openid,params.openid,params.unionid];
		}
	}
	pomelo.app.get('dbclient').insert(sql, args, function(err,res){
		if(err !== null){
			logger.error("register failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info("userDao register && success:\n" + res.insertId);
			if(userDao.isDebugPlayer(params.openid)){
				userDao.getUserInfoByNickName(params.nickname,function(err,user){
					if(!!err || !user) {
						logger.error('Get user for userDao failed! ' + err);
						utils.invokeCallback(cb, err, null);
						return
					}
					utils.invokeCallback(cb,null,user);
				});
			} else {
				userDao.getUserInfoByOpenID(params.openid,params.unionid,function(err,user){
					if(!!err || !user) {
						logger.error('Get user for userDao failed! ' + err);
						utils.invokeCallback(cb, err, null);
						return
					}
					utils.invokeCallback(cb,null,user);
				});
			}
		}
	});
}

userDao.getUserInfoByUserID = function(userId,cb){
	var sql = 'select * from user where userID=?';
	var args = [userId];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("getUserInfo failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info("userDao getUserInfoByUserID && success:\n" + JSON.stringify(res));
			utils.invokeCallback(cb, null,res[0]);
		}
	});
}

userDao.getUserInfoByOpenID = function(openid,unionid,cb){
	var sql = 'select * from user where openid=? or unionid = ?';
	var args = [openid,unionid];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("getUserInfo failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info("userDao getUserInfoByOpenID && success:\n" + JSON.stringify(res));
			utils.invokeCallback(cb, null,res[0]);
		}
	});
}

userDao.getUserInfoByNickName = function(nickName,cb){
	var sql = 'select * from user where nickname=?';
	var args = [nickName];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("getUserInfo failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info("userDao getUserInfoByNickName && success:");
			if(res.length > 0){
				utils.invokeCallback(cb, null,res[0]);
			} else {
				utils.invokeCallback(cb, null,null);
			}
		}
	});
}

/**
setting = {
	gameStatus :0,
	isCanJoin :0,
	isInvite :0,
	isAddFriend :0,
}
*/
userDao.updateFriendSetting = function(setting,userId,cb){
	var sql = "update user set";
	var args = [];

	for ( var key in setting ){
		sql = sql + ' ' + key + "= "  + " ?,";
		args.push(setting[key]);
	}


	sql = sql.substring(0,sql.length-1);
	sql = sql + " where userID = ?";
	args.push(userId);

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('update updateGameSetting err!' + err);
			utils.invokeCallback(cb,err, null);
		} else {
			if (!!res && res.affectedRows>0) {
				logger.info('update updateGameSetting success!');
				utils.invokeCallback(cb,null,true);
			} else {
				logger.info('update updateGameSetting failed!');
				utils.invokeCallback(cb,null,false);
			}
		}
	});
}

userDao.getFriendSetting = function(userId,cb){
	var sql = "select isCanJoin,isInvite,isAddFriend from user where userID = ?";
	var args = [userId];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('update updateGameSetting err!' + err);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info('update updateGameSetting success!');
			utils.invokeCallback(cb,null,res[0]);
		}
	});
}

//获取玩家客户端需要用到的信息 点击头像用到
userDao.getUserClientInfo = function(userId,cb){
	var sql = 'select userID as userId,openid,nickname,sex,headimgurl,gold,fightCardCount,fightNum,winNum,dianPaoNum,zimoNum from user where userID=?';
	var args = [userId];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error("getUserInfo failed" +  err);
			utils.invokeCallback(cb, err, null);
		} else {
			logger.info("userDao getUserClientInfo && success:\n" + JSON.stringify(res));
			utils.invokeCallback(cb, null,res[0]);
		}
	});
}



userDao.update = function(params,userId,cb){
	console.log("userDao.update"+util.inspect(params));
	var sql = "update user set";
	var args = [];

	for ( var key in params ){
		sql = sql + ' ' + key + "= "  + " ?,";
		args.push(params[key]);
	}


	sql = sql.substring(0,sql.length-1);
	sql = sql + " where userID = ?";
	args.push(userId);

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('update update err!' + err);
			utils.invokeCallback(cb,err, null);
		} else {
			if (!!res && res.affectedRows>0) {
				logger.info('update update success!');
				utils.invokeCallback(cb,null,true);
			} else {
				logger.info('update update failed!');
				utils.invokeCallback(cb,null,false);
			}
		}
	});
}

userDao.isDebugPlayer = function (openid){
	return (openid.indexOf("oxUatx") == -1);
}