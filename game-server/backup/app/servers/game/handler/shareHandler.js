var userDao = require('../../../dao/userDao');
var gameData = require('../../../util/dataApi').game;
var roleMgr = require('../../../domain/mgr/roleMgr');


var logger = require('pomelo-logger').getLogger('guilin', __filename);

module.exports = function(app)
{
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
};


// 分享界面 给分享次数
Handler.prototype.entry = function(msg,session,next){
	var userId = msg.userId;
	roleMgr.getUserInfo(session,userId,function(roleData){
		var shareStatus = roleData.shareStatus;
		var shareTimes = roleData.shareTimes;

		next(null,{ code : 200,shareStatus : shareStatus,shareTimes : shareTimes} );
	});
}

// 分享次数 加房卡
Handler.prototype.share = function(msg,session,next){
	var userId = msg.userId;

	roleMgr.getUserInfo(session,userId,function(roleData){
		var shareCfg =  gameData.findBy('key','share');
		var param0 = shareCfg[0].param0;
		var shareData = param0.split(';');

		logger.info("roleData %%%%%%%%%%%===" + JSON.stringify(roleData))

		var shareTimes = roleData.shareTimes;
		var shareStatus = roleData.shareStatus;

	 	logger.info("shareTimes ::::" + shareTimes)
	 	logger.info("shareStatus ::::" + shareStatus)

	 	if (!roleData) {
	 		next(null,{ code : 500,msg : "内存无数据,无法分享"} );
	 		return;
	 	}

	 	if (shareStatus == 1) {
	 		next(null,{ code : 500,msg : "领取按钮，怎么能用分享的接口？？？"} );
	 		return;
	 	}

		for (var i = 0; i < shareData.length; i++) {
			var item = shareData[i].split(',');
			if ((shareTimes + 1) == item[0]) {
				shareStatus = 1;
				break;
			}
		} 

		roleMgr.updateUserInfo(session,userId,{shareTimes : (shareTimes + 1),shareStatus: shareStatus},true);
		userDao.update({shareTimes : (shareTimes+1),shareStatus: shareStatus},userId);

		next(null,{ code : 200,shareStatus : shareStatus,shareTimes : shareTimes + 1 } );
	});

}

// 领取
Handler.prototype.get = function(msg,session,next){
	var userId = msg.userId;

	roleMgr.getUserInfo(session,userId,function(roleData){
		var shareCfg =  gameData.findBy('key','share');
		logger.info("shareCfg ::::" + JSON.stringify(shareCfg))
		var param0 = shareCfg[0].param0;
		var shareData = param0.split(';');

		var shareTimes = roleData.shareTimes;
		var fightCardCount = roleData.fightCardCount;
		var shareStatus = roleData.shareStatus;

	 	logger.info("shareTimes ::::" + shareTimes)
	 	logger.info("fightCardCount ::::" + fightCardCount)
	 	logger.info("shareStatus ::::" + shareStatus)

	 	if (shareStatus == 0) {
	 		next(null,{ code : 500,msg : "分享按钮，怎么能用领取接口？？？"} );
	 		return;
	 	}

	 	var temp = fightCardCount;
		for (var i = 0; i < shareData.length; i++) {
			var item = shareData[i].split(',');
			console.log("item ::" + item)
			if (shareTimes == item[0]) {
				fightCardCount += parseInt(item[1]);
				shareStatus = 0;
				break;
			}
		} 
	 	logger.info("fightCardCount ::::" + fightCardCount)

		if (fightCardCount == temp) {
			next(null,{ code : 500,msg : "对战卡数量不对，不能领取"} );
			return;
		}

		roleMgr.updateUserInfo(session,userId,{fightCardCount : fightCardCount,shareStatus : shareStatus},true);
		userDao.update({fightCardCount : fightCardCount,shareStatus: shareStatus},userId);

		next(null,{ code : 200,fightCardCount : fightCardCount,shareStatus : shareStatus } );
	});

}