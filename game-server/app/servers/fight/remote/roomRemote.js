/**
 * Created by xieyq on 2017/3/28.
 */
var GameConst = require("../../../util/gameConstant");
var ArrayUtil = require("../../../util/arrayUtil");
var Player = require('../../../model/player');
var GameRoom = require('../../../model/room');
var Rule = require('../../../model/rule');
var ClientNet = require('../../../model/clientNet');
var Reconnect = require('../../../model/reconnect');
var utils = require('../../../util/utils');
var Code = require("../../../util/code");
var roomMgr = require("../../../domain/mgr/roomMgr");
//计算在线状态
var gameMgr = require('../../../domain/mgr/gameMgr');
var roleMgr = require("../../../domain/mgr/roleMgr");
var userDao = require("../../../dao/userDao");
var loginDao = require("../../../dao/loginDao");
var util = require("util");
module.exports = function(app) {
    return new RoomRemote(app);
};

var RoomRemote = function(app) {
    this.app = app;
    this.channelService = app.get('channelService');
};
var remote = RoomRemote.prototype;

//创建房间
remote.createRoom = function(msg,uid,sid,roomID,cb) {
    var channel =  this.channelService.getChannel(roomID, false);
    if(!! channel) {
        if(!!channel.userMap[uid]) {
            cb({
                code:Code.ROOM.CREATE_IS_HAVE_ROOM
            });
            return;
        }
    }
    console.log("roomRemote/createRoom " + util.inspect(msg));
    var globalChannel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = globalChannel.userMap[uid];
    if(player.roomId != -1){
        ClientNet.msgTip(player.uid,player.sid,1,GameConst.LANGUAGE.YOU_AREA_IN_ROOM,this.channelService);
        cb({
            code:Code.ROOM.YOU_ARE_IN_ROOM
        });
        return;
    }
    if(! player.roomCardEnough(msg.juShu)) {
        ClientNet.msgTip(player.uid,player.sid,1,GameConst.LANGUAGE.NO_ENOUGH_CARD,this.channelService);
        cb({
            code:Code.ROOM.ROOM_CARD_NOT_ENOUGH
        });
        return;
    }
    channel = this.initChannel(roomID);
    player.roomId = roomID;
    channel.userMap = {};
    channel.userMap[player.uid] = player;
    channel.room = GameRoom(roomID, this.channelService);
    channel.room.juShu = msg.juShu;
    channel.room.minHu = msg.huPai;
    channel.room.ziShu = msg.ziShu;
    channel.room.ziMo = msg.ziMo;
    channel.room.fanXing = msg.fanXing;
    channel.room.playerCreator = player;
    channel.room.status = "waiting";
    channel.room.addPlayer(player);
    channel.room.debugCard = ArrayUtil.parseIntDebugArr(msg.cardList);   //调试的牌,正式的话得去掉
    channel.add(uid,sid);
    var param = channel.room.getClientInfo();
    param["userList"] = channel.room.getClientUserInfo();
    param["code"] = 200;
    roomMgr.addRoom(channel.room);
    cb(param);
    ClientNet.enterReadyRoom(player.uid,player.sid,this.channelService,channel.room);
}

/**
 * Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 *@param
 *
 */

remote.add = function(sid, flag, param,cb) {
    gameMgr.init();
    var channel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, flag);
    if(! channel.userMap) {
        channel.userMap = {};
    }
    var clientInfo;
    var player =  Reconnect.getPlayerData(param.userID);
    if(!! player ) {
        if (player.roomId == -1) {
            Reconnect.delPlayer(player);
            player = null;
        } else {
            clientInfo = player.getClientInfo();
            player.token = param.token;
            player.openId = param.openId;
            player.refreshToken = param.refreshToken;
            player.isPublicWeb = param.isPublicWeb;
            clientInfo["token"] = player.token;
            clientInfo["openId"] = player.openId;
            clientInfo["refreshToken"] = player.refreshToken;
            cb(clientInfo,player.fightServerId);
            var roomData = Reconnect.getRoomData(player.roomId);
            var roomChannel = this.channelService.getChannel(player.roomId,false);
            ClientNet.reconnectPlayer(player, this.channelService, roomData,roomChannel);
            roleMgr.addRoleInfo(player);
        }
    }
    if(! player) {

        param["fightServerId"] = this.app.get('serverId');
        player = Player(sid, param);
        channel.userMap[player.uid] = player;
        channel.add(player.uid, sid);
        clientInfo = player.getClientInfo();
        clientInfo["token"] = player.token;
        clientInfo["openId"] = player.openId;
        clientInfo["refreshToken"] = player.refreshToken;
        cb(clientInfo,player.fightServerId);
        ClientNet.enterMainRoom(player,this.channelService);
        roleMgr.addRoleInfo(player);
    }
    var nowDate = new Date(Date.now());
    var dateNowStr = utils.timestampToDate(nowDate);
    player.loginTime = dateNowStr;
    console.log("roomRemote add player name:" + player.name + " sid:" + player.sid +" fightserver" + this.app.get('serverId'));
    loginDao.insertLogin(player.uid,player.loginTime);
};

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *  被动脱离 游戏
 */
remote.kick = function(uid, sid, cb) {
    var globalChannel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = globalChannel.userMap[uid];
    if(! player){
        return;
    }
    userDao.update({lastleavetime:utils.timestampToDate(Date.now())},player.uid);
    loginDao.insertExit(player.uid,player.loginTime);
    roleMgr.delRoleInfo(uid);
    if(! player){
        if (!!cb) {
            cb();
        }
        return;
    }
    if (player.roomId != -1) {
        //战斗中掉线需要断线重连
        var roomChannel = this.channelService.getChannel(player.roomId, false);
        if (roomChannel && roomChannel.room.gameStatus != "waitEnd" && roomChannel.room.gameStatus != "over") {
            player.isLost = true;
            ClientNet.pushPlayerLost(player, roomChannel.room, this.channelService);
            Reconnect.addPlayer(player, roomChannel.room);
        } else {
            player.clearRoomData();
            ClientNet.leaveToChannelDestroy(roomChannel, player.uid);
            if (!!globalChannel) {
                globalChannel.leave(uid, sid);
                delete  globalChannel.userMap[uid]
            }
        }
    } else {
        if (!!globalChannel) {
            globalChannel.leave(uid, sid);
            delete globalChannel.userMap[uid]
        }
    }
    if (!!cb) {
        cb();
    }
};


remote.initChannel = function (roomId) {
    var channel = this.channelService.getChannel(roomId, true);
    channel.userMap = {};
    return channel;
}



//加入房间
//{roomId : roomId}
remote.joinRoom = function(roomId,uid,sid,cb) {
    var channel = this.channelService.getChannel(roomId,false);
    if(! channel ||! channel.room) {
        cb({code:Code.ROOM.JOIN_ROOM_NO_ROOM});
        return;
    }
    if(channel.room.status == "full" || channel.room.status == "fight") {
        cb({code:Code.ROOM.JOIN_ROOM_ERROR_STATUS});
        return;
    }
    var globalChannel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM,false);

    var player = globalChannel.userMap[uid];
    if(player.roomId != -1) {
        ClientNet.msgTip(uid,sid,1,GameConst.LANGUAGE.YOU_ARE_IN_ROOM,this.channelService)
        cb({code:Code.ROOM.YOU_ARE_IN_ROOM});
        return;
    }
    channel.room.addPlayer(player);
    channel.userMap[player.uid] = player;
    player.roomId = roomId;
    channel.add(player.uid, player.sid);
    var clientRoomInfo =  channel.room.getClientInfo();
    clientRoomInfo["code"] = 200;
    cb(clientRoomInfo);
    ClientNet.enterReadyRoom(player.uid,player.sid,this.channelService,channel.room);
    ClientNet.pushUpdateUserList(channel);
    ClientNet.pushReadyInfo(channel);
    if(channel.room.userList.length == 3) {
        channel.room.status = 'full';
    }
}

//获取玩家当前的状态
//arr为[uid,uid]
remote.getPlayerStatus = function(arr,cb) {
    console.log("get playes status " + arr);
    var globalChannel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player;
    var obj = {};
    var channel;
    console.log("all players" + util.inspect(globalChannel.userMap));
    for (var i = 0; i < arr.length; i++) {
        player = globalChannel.userMap[arr[i]];
        if (!!player) {
            channel = this.channelService.getChannel(player.roomId, false);
            if(!!channel && !! channel.room)
            {
                 obj[player.uid] = {roomId: player.roomId, roomStatus: channel.room.status}
            } else {
                obj[player.uid]={};
            }
        }
    }
    cb(obj);
}


//在其他地方被玩家挤下线
remote.noteKicked = function(uid,sid,cb) {
    var channel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = channel.userMap[uid];
    if(! player){
        return;
    }
    var self = this;
    this.channelService.pushMessageByUids('onMoreLoginKicked',{} , [{
        uid: player.uid,
        sid: player.sid
    }],null,function(error){
        if(error) {
        } else {
            self.kick(uid,sid,cb);
        }
    });
}

//获取玩家数据
remote.getPlayer = function(uid,cb){
    var channel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = channel.userMap[uid];
    utils.invokeCallback(cb,player);
}

//更新玩家数据
remote.updateUserInfo = function(uid,params,send,cb){
    var channel = this.channelService.getChannel(GameConst.GLOBAL.GLOBAL_ROOM, false);
    var player = channel.userMap[uid];
    if(!! player) {
        for (var prop in params) {
            if(player.hasOwnProperty(prop)) {
                player[prop] = params[prop];
            }
            if(prop == "roomCard"){
                player.fightCardCount = params[prop];
            }
        }
        if(send){
             ClientNet.updateUserInfo(player.uid,player.sid,params,this.channelService);
        }
        utils.invokeCallback(cb,player);
    } else {
        utils.invokeCallback(cb,null);
    }
}

remote.addChatMsg = function(roomId,chat,cb){
    var channel = this.channelService.getChannel(roomId, false);
    channel.room.chatMsg.push(chat);
    utils.invokeCallback(cb,null);
}