/**
 * Created by xieyq on 2017/4/18.
 * 发送给客户端的消息
 * push 开头的均为广播消息
 */
var Card = require('./card');
var Reconnect = require('./reconnect');
var RoomIdUtil = require("../util/roomIdUtil");
var roomMgr = require("../domain/mgr/roomMgr");
var fightLogger = require('pomelo-logger').getLogger('fight', __filename, process.pid);
var util = require("util");
//通知所有玩家开始牌局
module.exports.pushStartFight = function(channel) {
    var gameRoom = channel.room;
    gameRoom.reset();
    gameRoom.currCircle ++;
    gameRoom.setLordUser();
    gameRoom.gameStatus = "waitLorder";
    gameRoom.status = 'fight';
    var nowCard = Card();
    gameRoom.card = nowCard;

    if(!! gameRoom.debugCard && gameRoom.debugCard.length > 0) {
        gameRoom.setCardlist(nowCard.debugCard(gameRoom.debugCard));
    } else {
        gameRoom.setCardlist(nowCard.assignCard(gameRoom.roomId));
    }

    channel.pushMessage({
            route: 'onEnterFightRoom',
            currPlayerUid: gameRoom.currPlayer.uid,
            userList:gameRoom.getClientUserInfo(),
            roomInfo:gameRoom.getClientInfo(),
            reConnect: 0
        });
}

//通知有人不同意解散房间
module.exports.notAgreeRelease = function(room,player,channelService) {
    var userList = room.userList;
    for(var i = 0 ;i < userList.length;i ++) {
        if(player.uid != userList[i].uid) {
            channelService.pushMessageByUids('onRespRleaseRoom',{uid:player.uid,name:player.name,agree:0} , [{
                uid: userList[i].uid,
                sid: userList[i].sid
            }]);
        }
    }
}

//通知有人请求解散战斗房间 uid是请求者
module.exports.pushRequestRleaseRoom = function(room,player,channelService) {
    var userList = room.userList;
    for(var i = 0 ;i < userList.length;i ++) {
        if(player.uid != userList[i].uid) {
            channelService.pushMessageByUids('onRquestReleaseRoom',{uid:player.uid,name:player.name} , [{
                uid: userList[i].uid,
                sid: userList[i].sid
            }]);
        }
    }
}

//通知玩家进入主场景创建房间的界面
module.exports.enterMainRoom = function(player,channelService) {
    player.clearRoomData();
    Reconnect.delPlayer(player);
    channelService.pushMessageByUids('onEnterMainRoom',{} , [{
        uid: player.uid,
        sid: player.sid
    }]);
}

//通知玩家进入准备房间
module.exports.enterReadyRoom = function(uid,sid,channelService,room,inFight) {
    if(! inFight) {
        inFight = 0;
    }

    channelService.pushMessageByUids('onEnterReadyRoom',{userList:room.getClientUserInfo(),roomInfo:room.getClientInfo(),inFight:parseInt(inFight)} , [{
        uid: uid,
        sid: sid
    }]);
}

//通知玩家进入战斗界面
module.exports.enterSigleFightRoom = function(uid,sid,channelService,room,lostConnect) {
    channelService.pushMessageByUids('onEnterFightRoom',{userList:room.getClientUserInfo(),roomInfo:room.getClientInfo(),reConnect:lostConnect} , [{
        uid: uid,
        sid: sid
    }]);
}



//通知玩家房间开始时的准备信息
module.exports.pushReadyInfo = function(channel) {
    var gameRoom = channel.room;
    //给客户端推送准备信息
    channel.pushMessage({
        route: 'onReadyInfo',
        readyList: gameRoom.readyList
     });
}

//通知房间 玩家的列表变更
module.exports.pushUpdateUserList = function(channel) {
    channel.pushMessage({
        route: 'onRoomUpdate',
        userList : channel.room.getClientUserInfo()
    });
}


//通知玩家掉线
module.exports.pushPlayerLost = function(player,room,channelService){
    var userList = room.userList;
    for(var i = 0 ;i < userList.length;i ++){
        if(player.uid != userList[i].uid){
            channelService.pushMessageByUids('onPlayerLost',{uid:player.uid,name:player.name} , [{
                uid: userList[i].uid,
                sid: userList[i].sid
            }]);
        }
    }
}

//通知玩家切出APP
module.exports.notePlayerOut = function(player,room,channelService){
    var userList = room.userList;
    for(var i = 0 ;i < userList.length;i ++){
        if(player.uid != userList[i].uid){
            channelService.pushMessageByUids('onPlayerOut',{uid:player.uid} , [{
                uid: userList[i].uid,
                sid: userList[i].sid
            }]);
        }
    }
}

//通知玩家回到APP
module.exports.notePlayerIn = function(player,room,channelService){
    var userList = room.userList;
    for(var i = 0 ;i < userList.length;i ++){
        if(player.uid != userList[i].uid){
            channelService.pushMessageByUids('onPlayerIn',{uid:player.uid} , [{
                uid: userList[i].uid,
                sid: userList[i].sid
            }]);
        }
    }
}

//某玩家离开房间,通知其他房间内玩家
module.exports.pushPlayerLeave = function(player,channel){
    channel.room.kickPlayer(player.uid);
    if (channel.room.status == "full") {
        channel.room.status = "waiting";
        delete channel.userMap[player.uid];
    }

    player.clearRoomData();
    channel.leave(player.uid, player.sid);

    if (channel.room.userList.length == 0) {
        this.destoryChannel(channel);
    } else {
        channel.pushMessage({
            route: 'onLeaveRoom',
            uid: player.uid,
            name:player.name
        });
    }
}

//通知哪个玩家出牌
module.exports.noteCurrPlayer = function(channel,uid,status){
    channel.pushMessage({
        route: 'onCurrPlayer',
        uid:uid,
        status:status
    });
}


//通知玩家重新进入游戏
module.exports.reconnectPlayer = function(player,channelService,room,channel) {
    player.isLost = false;
    console.log(room.status +"toreconnect" + player.name);
    if(room.status == "fight"){
        if(room.gameStatus == "waitNext"){
            var canNext = room.startNextFightOK(player.uid);
            if (canNext && room.releaseRoomList.length == 0){
                if(!! channel){
                    this.pushStartFight(channel);
                }
            } else {
                 this.enterReadyRoom(player.uid, player.sid, channelService, room,1);
            }
            this.pushPlayerConnect(player,channelService,room);
            this.pushMeReleaseRoom(room,player,channelService);

        } else {
            player.needReconnectFight = true;  //需要执行重连
            this.enterSigleFightRoom(player.uid, player.sid, channelService, room, 1);
        }
    } else {
        this.enterReadyRoom(player.uid,player.sid,channelService,room);
        this.pushPlayerConnect(player,channelService,room);
    }
}

//重新上线向玩家发送之前有其他人在请求解散的情况
module.exports.pushMeReleaseRoom = function(room,player,channelService) {
    if(!! room.timeOutReleaseId){
        //重新上线。通知有人请求解散
        if(player.uid != room.releasePlayer.uid){
            channelService.pushMessageByUids('onRquestReleaseRoom',{uid:room.releasePlayer.uid,name:room.releasePlayer.name} , [{
                uid: player.uid,
                sid: player.sid
            }]);
        }
    }
}

//通知玩家重新连接
module.exports.pushPlayerConnect = function(player,channelService,room) {
    var sendPlayer;
    for (var i = 0; i < room.userList.length; i++){
        sendPlayer = room.userList[i];
        if(sendPlayer.uid != player.uid){
            channelService.pushMessageByUids('onPlayerReconnected',{uid:player.uid} , [{
                uid : sendPlayer.uid,
                sid : sendPlayer.sid
            }]);
        }
    }
}


//处理房间下一局
module.exports.nextFightHandler = function(player,channelService,room,channel) {
    var hasLost = room.haveOutAndLost();
    if(hasLost){
        room.startNextFightOK(player.uid);
        this.enterReadyRoom(player.uid,player.sid,channelService,room,1);
    } else {
        var canNext = room.startNextFightOK(player.uid);
        if (canNext){
            fightLogger.info("canNextInfo to startFight" );
            this.pushStartFight(channel);
        } else {
            fightLogger.info("dont canNextInfo to startFight" + room.requestNextList.length);
        }
    }
}

//开始正式打斗
module.exports.startReconnectFight = function(channelService,room,player) {
    if(room.status != "fight"){
        return;
    }
    this.pushPlayerConnect(player,channelService,room);
    var matchResult = room.currMatchResult;
    if(!! matchResult && !! matchResult[player.uid]){
        channelService.pushMessageByUids('onCardCallBack', matchResult[player.uid],[{
            uid: player.uid,
            sid: player.sid
        }]);
    }
    channelService.pushMessageByUids('onCurrPlayer',{uid:room.currPlayer.uid,status:room.gameStatus},[{
        uid: player.uid,
        sid: player.sid
    }]);

    if (! (room.gameStatus == "waitPost" || room.gameStatus == "waitRequestNext")){
        channelService.pushMessageByUids('onShowCard',{id:room.currCardId} , [{
            uid: player.uid,
            sid: player.sid
        }]);
    }
    this.pushMeReleaseRoom(room,player,channelService);
}

//检测房间是否可以清除
module.exports.leaveToChannelDestroy = function(channel,uid){
    if (! channel){
        return;
    }
    if (!! channel.room){
        if (channel.room.gameStatus  == "over" || channel.room.gameStatus  == "waitEnd"){
            var userList = channel.room.userList;
            for (var i = 0;i < userList.length;i ++){
                if (userList[i].uid == uid){
                    userList.splice(i,1);
                    break;
                }
            }
            channel.room.userList = userList;
            console.log("channel.room.userList length:" +channel.room.userList.length);
            if (channel.room.userList.length == 0){
                console.log("room clear");
                this.destoryChannel(channel);
            }
        }
    } else {
        this.destoryChannel(channel);
    }
}

//清除channel  暂时先放这。代码整理后处理一个管理channel的类
module.exports.destoryChannel = function(channel){
    if(!! channel){
        if(channel.room){
            channel.room.destory();
            RoomIdUtil.deleteRoomID(channel.room.roomId);
            roomMgr.deleteRoom(channel.room.roomId);
        }
        channel.destroy();
    }
}

//更新玩家身上的数据
module.exports.updateFightUserInfo = function(param,channel) {
    param["route"] = "onInfoUpdate";
    channel.pushMessage(param);
}

//更新玩家身上的数据
//{uid:,sid:}
module.exports.updateUserInfo = function(uid,sid,param,channelService) {
    channelService.pushMessageByUids('onInfoUpdate',param , [{
        uid: uid,
        sid: sid
    }]);
}

//给客户端弹窗，1代表弹窗，2代表漂tip
//{uid:,sid:}
module.exports.msgTip = function(uid,sid,type,content,channelService) {
    channelService.pushMessageByUids('onMsgTip',{type:type,content:content} , [{
        uid: uid,
        sid: sid
    }]);
}
