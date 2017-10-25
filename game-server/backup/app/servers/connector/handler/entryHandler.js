var GameConst = require("../../../util/gameConstant");
var SessionUtil = require("../../../util/sessionUtil");
var userDao = require("../../../dao/userDao");
var Logger = require('pomelo-logger').getLogger('guilin', __filename);
var authLogger = require('pomelo-logger').getLogger('auth', __filename,process.pid);
var util = require("util");
var Code = require("../../../util/code");
var async = require('async');

//四位数房间
var MAX_ROOM_ID = 10000;
var roomIdArr = [];
module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};
var handler = Handler.prototype;
/**
 * New client entry.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
handler.enter = function(msg, session, next) {
	var self = this;
	var authCode = msg.code;
	var token = msg.token;
	var openId = msg.openId;
	var refreshToken = msg.refreshToken;
	var isPublicWeb = (msg.public == 1);
	if ((!authCode && !token) || (!! token && (! openId || ! refreshToken))) {
		new Error('invalid entry request: empty code and empty token');
		next(null,
			{code: Code.FAIL, msg: 'invalid entry request: empty code and empty token'}
		);
		return;
	}
	//==========================================================================================================
	var ipAddress = SessionUtil.getRemoteIPAddress(session);
	var params;
	authLogger.info("client enter: " + util.inspect(msg));
	async.waterfall([
		function (cb) {
			self.app.rpc.auth.authRemote.auth(session,authCode,token,openId,refreshToken,msg.username,ipAddress,isPublicWeb,cb);
		}, function (code, param, cb) {
			if (code != Code.OK) {
				next(null, {code: code});
				return;
			}
			if (! param) {
				next(null, {code: Code.ENTRY.FA_USER_NOT_EXIST});
				return;
			}
			params = param;
			var uid = String(params.userID);
			authLogger.info("get token from WX: " + params.nickname +" token: " + params.token + " openId: " + params.openId + " refreshToken:" + params.refreshToken);
			var sessionService = self.app.get('sessionService');
			if( !! sessionService.getByUid(uid)) {
				self.app.rpc.fight.roomRemote.noteKicked(session,params.userID,self.app.get("serverId"),function() {
					sessionService.kick(params.userID, cb);
				});
			} else {
				cb(null);
			}
		},
		function (cb) {
			session.bind(String(params.userID), cb);
		}, function (cb) {
			cb(null);
		}
	], function (err) {
		if (err) {
			next(err, {code: Code.FAIL});
			return;
		}
		session.on('closed', onUserLeave.bind(null, self.app));
		params["ipAddress"] = ipAddress;
		params["isPublicWeb"] = isPublicWeb;

		self.app.rpc.fight.roomRemote.add(session, self.app.get('serverId'), true, params, function (player,fightServerId) {
			if (player.roomId != -1) {
				session.set('roomId', player.roomId)
				session.push('roomId');
			}
			session.set("serverId",fightServerId);
			session.set("name",player.name);
			session.push('name');
			session.push('serverId');
			authLogger.info("player enter OK name: " + player.name +" token:" + player.token + " openId:" + player.openId + " refreshToken:" + player.refreshToken);

			next(null, {
				code: Code.OK,
				user: player
			});
			var sessions = session.__sessionService__.sessions;
			sessions[session.id].__socket__.on("heartbeat",function(){
				self.app.rpc.game.mailRemote.checkHaveNewMail(session,player,self.app.get('serverId'),function(result){

				});
			});
			self.app.rpc.game.mailRemote.checkHaveNewMail(session,player,self.app.get('serverId'),function(result){

			});
		});

	});
}

//客户端主动退出
handler.clientExit = function(msg, session, next) {
	var self = this;
	next(null,{});
	var sessionService = self.app.get('sessionService');
	sessionService.kick(session.uid);
}
/**
 * User log out handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function(app, session) {
	if(!session || !session.uid) {
		return;
	}
	console.log("to kick player");
	app.rpc.fight.roomRemote.kick(session, session.uid,app.get('serverId'), null);
	app.rpc.game.friendRemote.delInviteFriendMsg(session, session.uid,null);
};

