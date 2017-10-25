var utils = require('../util/utils');
var pomelo = require('pomelo');
var util = require("util");
var logger = require('pomelo-logger').getLogger('guilin', __filename);


var resultDao = module.exports;

/*
var params = {
	totalResult : {
		time : 1404958872, // date.now();
		roomID : 9421,
		user1 : 1,   // 庄  
		user2 : 2,   // 右
		user3 : 3,   // 左
		user1Result : {
			thCount : 0, 
			dhCount : 0,
			phCount : 0,
			zmCount : 0,
			dpCount : 0,
			slwkCount : 0,
			fxCount : 0,
			zsCount : 0   // 子数
		},
		user2Result : {
			thCount : 0, 
			dhCount : 0,
			phCount : 0,
			zmCount : 0,
			dpCount : 0,
			slwkCount : 0,
			fxCount : 0,
			zsCount : 0   // 子数
		},
		user3Result : {
			thCount : 0, 
			dhCount : 0,
			phCount : 0,
			zmCount : 0,
			dpCount : 0,
			slwkCount : 0,
			fxCount : 0,
			zsCount : 0   // 子数
		}
	},
	logs : [
		{
			time : 1000,   // Date.now();
			userID : 2,
			type : "dp-user2",   // 赢的方式 th dh ph zm dp-user1 slwk 
			fx : 12,       // 翻醒
			zs : 15        // 子数
		},
	]
}
*/
resultDao.addResult = function(params,cb){
	logger.info("addResult :::::")
	var totalResult = params.totalResult;
	var time = utils.timestampToDate(totalResult.time);

	var sql = 'insert into totalresult (time,fightNumber,roomID,user1,user2,user3,user1Result,user2Result,user3Result) values(?,?,?,?,?,?,?,?,?)';
	var args = [time,params.logs.length,totalResult.roomID,totalResult.user1,totalResult.user2,totalResult.user3,JSON.stringify(totalResult.user1Result),JSON.stringify(totalResult.user2Result),JSON.stringify(totalResult.user3Result)];
	pomelo.app.get('dbclient').insert(sql, args, function(err,res){
		if(err !== null){
			logger.error('resultDao err : ' + err.message);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info("resultDao addResult && success:\n" + res.insertId);
			resultDao.addResultLog(params.logs,res.insertId,cb);
		}
	});
}

/*
var params = {
	totalID : 1
	log : [
		{
			time : 1000,   // date.now();
			userID : 2,
			type : "ph",
			fx : 12,
			zs : 15        // 子数
		}
	]
}
*/
resultDao.addResultLog = function(logs,totalID,cb){
	console.log(totalID + "aaReslut log " + util.inspect(logs));
	var sql = 'insert into resultlog (time,userID,totalID,type,fx,zs) values';
	var args = [];

	for (var i = 0; i < logs.length; i++) {
		if (i == logs.length - 1) {
			sql = sql + "(?,?,?,?,?,?);";
		}else{
			sql = sql + "(?,?,?,?,?,?),";
		}
		args.push(utils.timestampToDate(logs[i].time),logs[i].userID,totalID,logs[i].type,logs[i].fx,logs[i].zs);
	}

	pomelo.app.get('dbclient').insert(sql, args, function(err,res){
		if(err !== null){
			logger.error('addResultLog err : ' + err.message);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info("resultDao addResultLog && success:\n" + res.insertId);
			utils.invokeCallback(cb, null);
		}
	});


	// utils.invokeCallback(cb, null);
}

/*
	userID : 要搜索战绩的玩家的userID
	start : 开始搜索的指针 .从0开始计
	num : 搜索的条数

	举例：
	userID为1的第一条记录
	resultDao.getMonthResults(1,0,1,fn)

	userID为1的第5条记录
	resultDao.getMonthResults(1,4,1,fn)

	userID为1的第10条记录开始，往后取11条记录(包括第10条)
	resultDao.getMonthResults(1,9,11,fn)

	返回值：如果有战绩则返回战绩数组，如果没有，则返回空数组

	数组，每一条一个战绩
	time ： 对战时间
	fightNumber : 局数
	winNum ： 胜
	loseNum ： 败
	user1Result user2Result  user3Result ： 三个人的战绩情况

	返回值举例：
	[
		{
		  "time":"2017-05-03T03:33:21.000Z",
		  "fightNumber":2,
		  "winNum":1,
		  "loseNum":1,
		  "roomID":9421,

		  "user1Result":{"thCount":1,"dhCount":0,"phCount":0,"zmCount":0,"dpCount":0,"slwkCount":0,"fxCount":0,"zsCount":0},
		  "user2Result":{"thCount":0,"dhCount":0,"phCount":0,"zmCount":0,"dpCount":1,"slwkCount":0,"fxCount":0,"zsCount":0},
		  "user3Result":{"thCount":0,"dhCount":0,"phCount":0,"zmCount":0,"dpCount":0,"slwkCount":0,"fxCount":0,"zsCount":0}
		}
	]

*/
resultDao.getMonthResults = function(userID,start,num,cb){
	// var sql = 'select time,fightNumber,roomID,user1,user2,user3,user1Result,user2Result,user3Result from TotalResult where user1 = ? or user2 = ? or user3 = ? order by time desc limit 4';

	var sql = "SELECT * FROM totalresult where (user1 = ? or user2 = ? or user3 = ?) and DATE_SUB(CURDATE(), INTERVAL 30 DAY) <= date(time) order by time desc limit ?,?;"

	var args = [userID,userID,userID,start,num];

	pomelo.app.get('dbclient').insert(sql, args, function(err,res){
		if(err !== null){
			logger.error('resultDao err : ' + err.message);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info("resultDao addResultLog && success:\n" + JSON.stringify(res) );
			var ret = [];
			var obj;
			if (res.length > 0) {
				for (var i = 0; i < res.length; i++) {
					obj = {};
					var item = res[i];
					var roomID = item.roomID;

					var userResult;
					if (userID == item.user1) {
						userResult = item.user1Result;
					}else if (userID == item.user2) {
						userResult = item.user2Result;
					}else if (userID == item.user3) {
						userResult = item.user3Result;
					}

					userResult = JSON.parse(userResult);

					var winNum = 0;
					var fields = ["thCount","dhCount","phCount","zmCount","dpCount","slwkCount"];
					for (var j = 0; j < fields.length; j++) {
						winNum += userResult[fields[j]];
					}

					obj.time = new Date(item.time).getTime();
					obj.fightNumber = item.fightNumber;
					obj.winNum = winNum;
					obj.loseNum = item.fightNumber - winNum;
					obj.roomID = item.roomID;
					obj.user1Result = JSON.parse(item.user1Result);
					obj.user2Result = JSON.parse(item.user2Result);
					obj.user3Result = JSON.parse(item.user3Result);

					ret.push(obj);
				}
				utils.invokeCallback(cb, null, ret);

			}else{
				utils.invokeCallback(cb, null, []);
			}

		}
	});
}



resultDao.getResults = function(userID,start,num,cb){
	var sql = 'select time,fightNumber,roomID,user1,user2,user3,user1Result,user2Result,user3Result from totalresult where user1 = ? or user2 = ? or user3 = ? order by time desc limit 4';

	var args = [userID,userID,userID];

	pomelo.app.get('dbclient').insert(sql, args, function(err,res){
		if(err !== null){
			logger.error('resultDao err : ' + err.message);
			utils.invokeCallback(cb,err, null);
		} else {
			logger.info("resultDao addResultLog && success:\n" + JSON.stringify(res) );
			utils.invokeCallback(cb, null,res[0]);
		}
	});
}
