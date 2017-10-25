/**
 * Created by xieyq on 2017/5/10.
 */
module.exports = function(app) {
    return new RoomRemote(app);
};

var RoomRemote = function(app) {
    this.app = app;
    this.channelService = app.get('channelService');
};
var remote = RoomRemote.prototype;


//将玩家加入聊天频道
remote.addPlayer = function(uid,sid,roomId,cb) {
    var roomChannel =   this.channelService.getChannel(roomId, true);
    roomChannel.add(uid,sid);
    cb();
}

//将玩家删除出频道
remote.delPlayer = function(uid,sid,roomId,cb) {
    var roomChannel =   this.channelService.getChannel(roomId, false);
    roomChannel.leave(uid,sid);
    cb();
}


//将频道清除
remote.delChannel = function(roomId,cb) {
    var roomChannel =   this.channelService.getChannel(roomId, false);
    roomChannel.destroy();
    cb();
}