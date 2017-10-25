var resultDao = require('../../../dao/resultDao');
var logger = require('pomelo-logger').getLogger('guilin', __filename);

module.exports = function(app)
{
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
};


Handler.prototype.getResults = function(msg,session,next){
	var userId = msg.userId;

	if( ! userId ) {
		logger.info("getResults @@@@@@@@@" + userId)
		next(null, {code: 500,error: true});
		return;
	}

	resultDao.getResults(userId,function(err,obj){
		if (err) {
			logger.error('[getResults] fail to invoke register for ' + err.stack);
			next(null, {code : 500});
		}else{
			logger.info("@@@@@getResults : " + JSON.stringify(obj))
			next(null,{ code : 200, param : obj});
		}
	});
}