var friendDao = require('../../../dao/friendDao');
var userDao = require('../../../dao/userDao');
var Code = require('../../../util/code');
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var roleMgr = require("../../../domain/mgr/roleMgr");
var ClientNet = require("../../../model/clientNet");
var GameConst = require('../../../util/gameConstant');
var friendMgr = require("../../../domain/mgr/friendMgr");
module.exports = function(app)
{
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
	this.channelService =  this.app.get('channelService');
};

/**
 * Search Friend.
 * 
 * @param {{identifier: number}} msg
 * @param {object} session
 * @param {function} next
 * @return {Promise.<void>}
 */
Handler.prototype.searchFriend = function(msg,session,next){
	var userId = session.uid;
	var self = this;
	if( ! userId ) {
		logger.info("searchFriend @@@@@@@@@" + userId)
		next(null, {code: 500,error: true});
		return;
	}

	friendDao.getFriend(userId,function(err,list,friendIDList){
		if (err) {
			logger.error('[getFriend] fail to invoke register for ' + err.stack);
			next(null, {code : 500});
		}else{
			/*
			obj回调的参数为 uid={roomId:XX,roomStatus:XX} 如果没在线。就没有此uid的数据
			roomStatus状态为
 			empty waiting full  fight //分别代表空房间，等待玩家，满了，已经开始
 			*/
			list.sort(function(a,b){
				if(a.winNum > b.winNum ){
					return -1;
				} else if(a.winNum == b.winNum){
					return 0;
				} else {
					return 1;
				}
			});
 			if (friendIDList.length > 0) {
 				self.app.rpc.fight.roomRemote.getPlayerStatus(session,friendIDList, function(obj){
 					var onLine = [];
 					var offLine = [];
 					var user = {};
 					for (var i = 0; i < list.length; i++) {
 						var _userID = list[i].userID;
						list[i]["rank"] = (i+1);
 						if (obj[_userID]) {
							console.log("在线" + _userID);
 							if (parseInt(_userID) == userId) {
 								user = list[i];
 							}else{
 								list[i].roomId = obj[_userID].roomId;
 								list[i].status = obj[_userID].roomStatus;
 								onLine.push(list[i]);
 							}
 						}else{
							console.log("不在线" + _userID);
 							if (parseInt(_userID) == userId) {
 								user = list[i];
 							}else{
 								offLine.push(list[i]);
 							}
 						}
 					}
 					next(null,{ code : 200,rank:user.rank,winNum:user.winNum, onLineList : onLine, offLineList : offLine  } );
 				});
 			}else{
 				// 列表为空
 				next(null,{ code : 200,rank:1} );
 			}
		}
	})

}

/**
 * Search request friend.
 *
 * @param {{identifier: number}} msg
 * @param {object} session
 * @param {function} next
 * @return {Promise.<void>}
 */
Handler.prototype.searchRequest = function(msg,session,next){
	var userId = session.uid;

	if( ! userId ) {
		next(null, {code: 500,error: true});
		return;
	}

	friendDao.getRequest(userId,function(err,list){
		if (err) {
			logger.info('[getRequest] fail to invoke register for ' + err.stack);
			next(null, {code: 500});
		}else{
			logger.info("@@@@@searchRequest@@@@@@" + JSON.stringify(list))
			next(null,{code: 200, list : list});
		}
	})
}


/**
 * Send add friend request to the Friend.
 * 发送好友请求
 *
 * @param {{identifier: number}} msg
 * @param {object} session
 * @param {function} next
 * @return {Promise.<void>}
 */
Handler.prototype.addFriend = function(msg,session,next){
	var userId = session.uid;
	var friendId = msg.friendId;

	if( ! userId  && ! friendId) {
		next(null, {code: 500,error: true});
		return;
	}
	var self = this;
	if(isNaN(friendId)){
		userDao.getUserInfoByNickName(friendId,function(err,result){
			if(err){
				next(null, {code: 500,error: true});
			} else {
				if(! result){
					next(null,{code:Code.FRIEND.NO_THIS_USER});
				} else {
					friendId = result.userID;
					if(friendId == userId){
						ClientNet.msgTip(session.uid,session.frontendId,1,GameConst.LANGUAGE.IS_ADD_SELF_FRIEND,self.channelService);
						next(null, {code: Code.FAIL});
					} else {
						self.addFriendResult(userId,friendId,next);
					}
				}
			}
		})
	} else {
		if(friendId == userId){
			ClientNet.msgTip(session.uid,session.frontendId,1,GameConst.LANGUAGE.IS_ADD_SELF_FRIEND,self.channelService);
			next(null, {code: Code.FAIL});
		} else {
			self.addFriendResult(userId,friendId,next);
		}
	};
}

Handler.prototype.addFriendResult = function(userId,friendId,next){
	var self = this;
	friendDao.checkIsFriend(userId,friendId,function(err,result){
		if(err){
			next(null, {code: Code.FAIL});
		} else {
			if(result){
				next(null, {code: Code.FRIEND.IS_IN_FRIEND});
			} else {
				friendDao.isAddFriend(friendId,function(err,bIsAddFriend){
					// 将friendID加入request列表
					if(bIsAddFriend == 0){
						next(null,{code:Code.FRIEND.NO_THIS_USER});
					} else {
						if (bIsAddFriend == 1) {
							friendDao.addRequest(userId,friendId,function(err){
								if (err) {
									logger.error('[addRequest] fail to invoke register for ' + err.stack);
									next(null, {code: Code.FAIL});
								}else{
									// 申请好友请求成功
									next(null,{code: Code.OK});
								}
							});
						} else {
							// 禁止被添加为好友
							next(null,{code: Code.FRIEND.FORBID_ADD_FRIEND});
						}
					}
				});
			}
		}
	});
}
/**
 * Reply if I agree the Friend's add request.
 *
 * @param {{identifier: number, reply: number}} msg
 * @param {object} session
 * @param {function} next
 * @return {Promise.<void>}
 */
Handler.prototype.replyAddFriend = function(msg,session,next){
	var userId = msg.userId;
	var friendId = msg.friendId;

	if( ! userId  && ! friendId) {
		next(null, {code: 500,error: true});
		return;
	}

	friendDao.replyAddFriend(userId,friendId,function(err){
		if (err) {
			logger.error('[addFriend] fail to invoke register for ' + err.stack);
			next(null, {code: 500});
		}else{
			// 添加好友
			next(null,{code: 200});
		}
	})
}

/**
 * Remove the Friend from my friend list and remove myself from the Friend's friend list.
 *
 * @param {{identifier: number}} msg
 * @param {object} session
 * @param {function} next
 * @return {Promise.<void>}
 */
Handler.prototype.deleteFriend = function(msg,session,next){
	var userId = msg.userId;
	var friendId = msg.friendId;

	if( ! userId  && ! friendId) {
		next(null, {code: 500,error: true});
		return;
	}

	friendDao.deleteFriend(userId,friendId,function(err){
		if (err) {
			logger.error('[deleteFriend] fail to invoke register for ' + err.stack);
			next(null, {code: 500});
		}else{
			// 删除好友成功
			next(null,{code: 200});
		}
	})
}

// 邀请好友 游戏
Handler.prototype.inviteFriend = function(msg,session,next){
	var userId = session.uid;
	var friendId = msg.friendId;
	if( ! userId  && ! friendId) {
		next(null, {code: 500,error: true});
		return;
	}
	var self = this;
	if(friendMgr.getInviteData(userId,friendId) == 1){
		ClientNet.msgTip(session.uid,session.frontendId,1,GameConst.LANGUAGE.IS_IN_INVITE_LIST,self.channelService);
		next(null,{
			code:Code.FAIL
		});
		return;
	}
	roleMgr.getUserInfo(session,friendId,function(player){
		if(player){
			if(player.roomId != -1){
				console.log("friendHandler/inviteFriend sid" + session.frontendId)
				ClientNet.msgTip(session.uid,session.frontendId,1,GameConst.LANGUAGE.PLAYER_IN_ROOM,self.channelService);
				next(null,{
					code:Code.FAIL
				});
			} else {
				friendMgr.addInviteData(userId,friendId);
				self.channelService.pushMessageByUids('invite', {
					userId : userId,
					roomId : session.get('roomId')
				}, [{uid : player.uid, sid : player.sid}]);
				next(null,{
					code:Code.OK
				});
			}
		} else {
			ClientNet.msgTip(session.uid,session.frontendId,1,GameConst.LANGUAGE.PLAYER_OFF_LINE,self.channelService);
			next(null,{
				code:Code.FAIL
			});
		}
	});

}

// 拒绝好友的游戏的邀请
Handler.prototype.refuseInviteFight = function(msg,session,next){
	var userId = session.uid;
	var inviteID = msg.inviteID;
	var self = this;
	if(friendMgr.getInviteData(inviteID,userId) == 1){
		roleMgr.getUserInfo(session,inviteID,function(player){
			if(player){
				friendMgr.delInviteData(inviteID,userId);
				ClientNet.msgTip(player.uid,player.sid,1,session.get("name") +" " +GameConst.LANGUAGE.REFUSE_INVITE_GAME,self.channelService);
					next(null,{
						code:Code.OK
					});
			} else {
				ClientNet.msgTip(session.uid,session.frontendId,1,GameConst.LANGUAGE.PLAYER_OFF_LINE,self.channelService);
				next(null,{
					code:Code.FAIL
				});
			}
		});
	} else {
		ClientNet.msgTip(session.uid,session.frontendId,1,GameConst.LANGUAGE.DATA_WRONG,self.channelService);
		next(null,{
			code:Code.FAIL
		})
	}
}

Handler.prototype.agreeInviteFight = function(msg,session,next){
	var userId = session.uid;
	var inviteID = msg.inviteID;
	if( ! userId) {
		next();
	} else {
		friendMgr.delInviteData(inviteID,userId);
		next();
	}
}