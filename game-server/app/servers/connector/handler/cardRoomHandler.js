/**
 * Created by xieyq on 2017/3/28.
 */
var GameConst = require("../../../util/gameConstant");
var RoomIdUtil = require("../../../util/roomIdUtil");
var Code = require("../../../util/code");
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
};
var handler = Handler.prototype;

//创建房间开启频道
handler.createRoom = function(msg, session, next) {
    var self = this;
    var roomID  = RoomIdUtil.createRoomID();
    session.set('roomId', roomID);
    session.push('roomId', function(err) {
        if(err) {
            console.error('set rid for session service failed! error is : %j', err.stack);
        }
    });
    self.app.rpc.fight.roomRemote.createRoom(session,msg,session.uid,self.app.get('serverId'),roomID,function(param){
        if(param["code"] == Code.OK) {
            self.app.rpc.chat.chatRemote.addPlayer(session,session.uid,self.app.get('serverId'),roomID,function() {
                next(null,
                    param);
            });
        } else {
            next(null,
                param);
        }
    });
}

//加入房间开启频道
//{roomId:记间编号}
handler.joinRoom = function(msg, session, next) {
    var self = this;
    var roomID = msg.roomId;
    session.set('roomId', roomID);
    session.push('roomId', function(err) {
        if(err) {
            console.error('set rid for session service failed! error is : %j', err.stack);
        }
    });
    self.app.rpc.fight.roomRemote.joinRoom(session,roomID,session.uid,self.app.get('serverId'),function(param){
        self.app.rpc.chat.chatRemote.addPlayer(session,session.uid,self.app.get('serverId'),roomID,function(){
            next(null, param);
        });
    });
}

