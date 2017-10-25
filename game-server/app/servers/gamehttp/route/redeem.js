var logger = require('pomelo-logger').getLogger('guilin', __filename);
var redeemDao = require('../../../dao/redeemDao');
var roleMgr = require('../../../domain/mgr/roleMgr');

// 生成兑换码
// count : 生成数量
// times : 兑换码可以使用的次数
// fightCard : 兑换的对战卡数量
module.exports = function(app, http) {
	/*http.post('/createRedeem', function(req, res) {
		logger.info("redeem");
		var count = req.body.count;
		var times = req.body.times;
		var fightCard = req.body.fightCard;
		var batch = req.body.batch;

		if (!count || !times || !fightCard || !batch) {
			res.send({code : 500, msg : '参数错误'})
			return;
		}

		logger.info("count :" + count);
		logger.info("times :" + times);
		logger.info("fightCard :" + fightCard);
		logger.info("batch :" + batch);

		redeemDao.create(count,times,fightCard,batch,function(err,setting){
			if (err) {
				logger.error("createRedeem error : " + err.stack);
				res.send({code : 500,msg : "createRedeem error"})
			}else{
				logger.info("createRedeem success : ");
				res.send({code : 200})
			}
		})
	});

	http.post('/test', function(req, res) {
		logger.info("count :" + req.body.count);
		logger.info("userId :" + req.body.userId);

		var userId = req.body.userId;
		roleMgr.getUserInfo(null,userId,function(roleData){
			var shareStatus = roleData.shareStatus;
			var shareTimes = roleData.shareTimes;
			var fightCardCount = roleData.fightCardCount;

			logger.info("shareStatus :" + shareStatus);
			logger.info("shareTimes :" + shareTimes);
			logger.info("fightCardCount :" + fightCardCount);


			res.send({code : 200})
		});
	});*/

};
