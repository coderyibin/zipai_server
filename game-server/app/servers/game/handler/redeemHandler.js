var redeemDao = require('../../../dao/redeemDao');
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var roleMgr = require("../../../domain/mgr/roleMgr");
module.exports = function(app)
{
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
};

// 检测兑换码是否有效 
Handler.prototype.check = function(msg,session,next){
	var redeemKey = msg.redeemKey;
	var userId = msg.userId;
	roleMgr.getUserInfo(session,session.uid,function(player){

		redeemDao.check(userId,redeemKey,player.codeInit,player.name,function(err,param){
			if (err) {
				logger.error('redeem check err: ' + err.stack);
				next(null, {code : 500,msg : "数据出错"});
			}else{
				if (param.fightCard) {
					next(null, {code : 200,msg : param.msg,fightCard : param.fightCard});
				}else{
					next(null, {code : 500,msg : param.msg});
				}
			}
		})

	});
}
