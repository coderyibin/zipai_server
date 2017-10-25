/**
 * Created by xieyq on 2017/5/10.
 * 聊天
 */
var Code = require("../../../util/code");
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService = this.app.get('channelService');
}

var handler = Handler.prototype;

//发送消息
handler.sendChatMsg = function (msg, session, next) {
    var self = this;
   var content =  msg.content;
    var roomId = session.get('roomId');
    var channel = this.channelService.getChannel(roomId, false);
    console.log("channel chat is have" +channel);
    self.app.rpc.fight.roomRemote.addChatMsg(session,roomId,{uid:session.uid,content:content},function(){

    });
    channel.pushMessage({
        route: 'onChatMsg',
        content: content,
        uid: session.uid
    });
    next(null,{
        code: Code.OK
    });
}