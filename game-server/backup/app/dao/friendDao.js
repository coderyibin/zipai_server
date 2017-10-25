var utils = require('../util/utils');
var pomelo = require('pomelo');
var userDao = require('./userDao');
var EventProxy = require('eventproxy');
var async = require('async');
var logger = require('pomelo-logger').getLogger('guilin', __filename);



var friendDao = module.exports;


// 申请好友列表
friendDao.getRequest = function(userID,cb){
	var sql = 'select nickname,friendID from user inner join (select user1 as friendID from friend where user2 = ? and status = 0) requestDB on user.userID=requestDB.friendID';
	var args = [userID];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('getFriend err : ' + err);
			utils.invokeCallback(cb,err, null);
		} else {
			utils.invokeCallback(cb, null,res);
		}
	});

}

// 好友列表用户信息
friendDao.getFriendInfo = function(ids,cb){
	var sql = 'select user.userID,nickname,winNum,fightNum,dianPaoNum,zimoNum,headimgurl from user where user.userID in (';

	for (var i = 0; i < ids.length; i++) {
		if (i == ids.length - 1) {
			sql = sql  + "?)";
		}else{
			sql = sql  + "?,";
		}
	}

	sql = sql + " order by winNum desc";
	var args = ids;

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('getFriendInfo err : ' + err);
			utils.invokeCallback(cb,err, null);
		}else{
			logger.info("getFriendInfo res ::::::::" + JSON.stringify(res) )
			
			utils.invokeCallback(cb,err, res);
		}
	});
}

//查询是否已经是好友
friendDao.checkIsFriend = function(userId,friendID,cb) {
	var sql = "select user1 as user from friend where user2 = ? and status = 1 union select user2 as user from friend  where user1 = ? and status = 1";
	var args = [userId,userId];
	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err){
			logger.error('checkIsFriend err : ' + err);
			utils.invokeCallback(cb,err);
		} else {
			if (res.length > 0) {
				for (var i = 0; i < res.length; i++) {
					if(res[i]['user'] == friendID){
						utils.invokeCallback(cb,null,true);
					} else {
						utils.invokeCallback(cb,null,false);
					}
				}
			}else{
				utils.invokeCallback(cb,null,false);
			}
		}
	});
}

// 得到玩家的好友模块数据  好友列表 
friendDao.getFriend = function(userID,cb){
	logger.info("@@@@@@@@@getFriend@@@@@@@@@@")

	// 好友列表申请
	var sql = "select user1 as user from friend where user2 = ? and status = 1 union select user2 as user from friend  where user1 = ? and status = 1";

	var args = [userID,userID];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('getFriend err : ' + err);
		} else {

			if (res.length > 0) {
				var friendID = [];
				for (var i = 0; i < res.length; i++) {
					friendID.push(res[i]['user']); 
				}

				friendID.push(userID)
				friendDao.getFriendInfo(friendID,function(err,list){
					if (err) {
						utils.invokeCallback(cb,err, null);
					}else{
						utils.invokeCallback(cb,null,list,friendID);
					}
				})
			}else{
				utils.invokeCallback(cb,null,[],[]);
			}
		}
	});
}

// 存储好友请求
friendDao.addRequest = function(userID,friendID,cb) {
	// 好友插入,防止重复插入
	var sql = "insert into friend (user1,user2,status) select ?,?,0 from dual where not exists  (select * from friend where user1 = ? and user2 = ?);";
	var args = [userID,friendID,userID,friendID];

	logger.info("sql!!!!!! @@@" + sql)
	logger.info("args!!!!!! @@@" + args)

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('addRequest err : ' + err);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info("friendDao addRequest && success:\n" + JSON.stringify(res));
			utils.invokeCallback(cb, null);
		}
	});
}


// 同意添加好友请求
friendDao.replyAddFriend = function(userID,friendID,cb) {
	var sql = "update friend set status = 1 where user1 = ? and user2 = ?";
	var args = [friendID,userID];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('add err : ' + err);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info("friendDao add && success:\n" + res);
			utils.invokeCallback(cb, null);
		}
	});
}

// 从好友列表中删除friendID
friendDao.deleteFriend = function(userID,friendID,cb) {
	var sql = "delete from friend where (user1 = ? and user2 = ?) or (user1 = ? and user2 = ?)";
	var args = [userID,friendID,friendID,userID];

	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('deleteFriend : ' + err);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info("friendDao deleteFriend && success:\n" + res);
			utils.invokeCallback(cb, null);
		}
	});
}


// 是否可以被添加为好友
friendDao.isAddFriend = function(userID,cb){
	var sql = 'select isAddFriend from user where userID = ?';
	var args = [userID];
	pomelo.app.get('dbclient').query(sql, args, function(err,res){
		if(err !== null){
			logger.error('friendDao isAddFriend err : ' + err);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info("friendDao isAddFriend && success:\n" + JSON.stringify(res[0]) );
			var type = 0;
			if(res.length > 0){
				if (res[0].isAddFriend == 0) {
					type = 1;
				} else {
					type = 2;
				}
			}
			utils.invokeCallback(cb,err,type)
		}
	});
}