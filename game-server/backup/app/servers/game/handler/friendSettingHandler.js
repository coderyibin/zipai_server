var userDao = require('../../../dao/userDao');
var logger = require('pomelo-logger').getLogger('guilin', __filename);

module.exports = function(app)
{
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
};

Handler.prototype.query = function(msg,session,next){
	var userId = msg.userId;

	if( ! userId  ) {
		logger.info("query @@@@@@@@@" + userId)
		next(null, {code: 500});
		return;
	}

	userDao.getFriendSetting(userId,function(err,setting){
		next(null,{ code : 200, setting : setting});
	})
}

// 玩家游戏状态
Handler.prototype.update = function(msg,session,next){
	var userId = msg.userId;
	var isCanJoin = msg.isCanJoin;
	var isInvite = msg.isInvite;
	var isAddFriend = msg.isAddFriend;


	// 玩家游戏状态 0：下线 1：空闲 2：等待中 3：游戏中
	if( ! userId  ) {
		logger.error("getFriendInfo @@@@@@@@@" + userId)
		next(null, {code: 500});
		return;
	}

	var setting = {};
	if (isCanJoin == 0 || isCanJoin == 1) {
		setting.isCanJoin = isCanJoin;
	}

	if (isInvite == 0 || isInvite == 1) {
		setting.isInvite = isInvite;
	}

	if (isAddFriend == 0 || isAddFriend == 1) {
		setting.isAddFriend = isAddFriend;
	}

	userDao.update(setting,userId,function(err,value){
		if (err) {
			logger.error('[updateSetting] fail to invoke register for ' + err.stack);
			next(null, {code : 500});
		}else{
			if(value){
				logger.info("@@@@@updateSetting  success: ")
				next(null,{ code : 200});
			}else{
				next(null,{ code : 201});
			}
		}
	});
}

