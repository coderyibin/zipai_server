/**
 * Created by xieyq on 2017/4/21.
 * 关于房间进场离场的操作
 */
var ClientNet = require('../../../model/clientNet');
var roomMgr = require('../../../domain/mgr/roomMgr');
var Code = require("../../../util/code");
var pomelo = require("pomelo");
var roomLogger = require('pomelo-logger').getLogger('room', __filename, process.pid);
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService =  this.app.get('channelService');
}
var handler = Handler.prototype;

// 正常离开房间
handler.requestLeaveRoom = function(msg, session, next) {
    var roomId = session.get("roomId");
    if (!roomId) {
        next(null, {
                code: Code.FIGHT.NO_ROOM_ID
            });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    if (channel.room.status == "fight") {
        next(null, {
                code: Code.FIGHT.NOT_LEAVE_IN_FIGHTING,
                msg: "is in fighting"
            });
        return;
    }
    var player = channel.userMap[session.uid];
    if (player.uid == channel.room.playerCreator.uid) {
        next(null, {
            code: Code.FIGHT.CREATOR_NOT_LEAVE,
            msg: "is creator"
        });
        return;
    }
    var self = this;
    session.set("roomId",null);
    self.app.rpc.chat.chatRemote.delPlayer(session,player.uid,player.sid,roomId,function(){

    });
    ClientNet.pushPlayerLeave(player, channel);
    ClientNet.enterMainRoom(player, this.channelService);
    ClientNet.pushUpdateUserList(channel);

    next(null,{
        code: Code.OK
    });
}

//房主在准备界面直接强制解散房间
handler.forceReleaseRoom = function(msg, session, next) {
    var roomId = session.get("roomId");
    if(! roomId) {
        next(null,{
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    if(channel.room.status == "fight") {
        next(null, {
            code: Code.FIGHT.NOT_RELEASE_IN_FIGHTING,
            msg: "is in fighting"
        });
        return;
    }
    next(null, {
        code: Code.OK
    });
    session.set("roomId",null);
    this.toEnterMainRoom(channel,this.channelService);
}

//在战斗界面中，某玩家请求解散房间
handler.requestReleaseRoom = function(msg, session, next) {
    var roomId = session.get("roomId");
    if(! roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    if(channel.room.status != "fight") {
        next(null, {
            code: Code.FIGHT.NOT_IN_FIGHTING,
            msg: "not in fighting"
        });
        return;
    }
    var player = channel.userMap[session.uid];
    if(! channel.room.timeOutReleaseId) {
        channel.room.clearRelaseList();
        channel.channelService = this.channelService;
        channel.room.releasePlayer = player;
        var self =this;
        channel.room.timeOutReleaseId =  setTimeout(function() {
            roomLogger.info("room be out by timeout " + channel.roomId);
            self.toEnterMainRoom(channel,self.channelService);
        },180000);
    }
    channel.room.addReleaseRoom(player.uid);
    ClientNet.pushRequestRleaseRoom(channel.room,player,this.channelService);
    next(null, {
        code: Code.OK
    });
}


//对 有人请求解散房间  的回应
//msg. ok  = 0 或 1
handler.responseReleaseRoom = function(msg, session, next) {
    var roomId = session.get("roomId");
    if (!roomId) {
        next(null, {
                code: Code.FIGHT.NO_ROOM_ID
            });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var player = channel.userMap[session.uid];

    if (parseInt(msg.ok) == 0) {
        //代表不同意
        ClientNet.notAgreeRelease(channel.room,player,this.channelService);
        channel.room.clearRelaseList();
    }
    if (parseInt(msg.ok) ==1) {
        //代表同意
        channel.room.addReleaseRoom(player.uid);
        if(channel.room.releaseRoomList.length == 3) {
            this.toEnterMainRoom(channel,this.channelService);
        }
    }
    next(null, {
        code: Code.OK
    });
}

//房间结束，所有人进入主界面。有战绩的插入战绩
handler.toEnterMainRoom = function(channel,channelService) {
    channel.room.clearRelaseList();
    channel.room.instertResultSql();
    //解散房间进入主界面
    for(var i = 0;i < channel.room.userList.length;i ++) {
        ClientNet.enterMainRoom(channel.room.userList[i],channelService);
    }
    roomMgr.deleteRoom(channel.room.roomId);
    pomelo.app.rpc.chat.chatRemote.delChannel(null,channel.room.roomId,function() {

    });
    ClientNet.destoryChannel(channel);
}


//游戏结束后玩家请求进入主界面
handler.exitFightRoom = function(msg, session, next)
{
    var roomId = session.get("roomId");
    if (!roomId) {
        next(null, {
                code: Code.FIGHT.NO_ROOM_ID
            });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    if(channel && channel.room && channel.room.gameStatus == "over") {
        ClientNet.enterMainRoom(channel.userMap[session.uid],this.channelService);
        ClientNet.leaveToChannelDestroy(channel,session.uid);
    }
    next(null,{
        code:Code.OK
    });
}