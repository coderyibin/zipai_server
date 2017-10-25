/**
 * Created by xieyq on 2017/3/23.
 */
module.exports = {
    DATA:{
        PUBLIC_APPID : "wx3a59f73be0ffa843",
        PUBLIC_SECRET : "56d8cdbf3d09df26d734eb6bd97bff89",
        PUBLIC_MACH_ID:'1485617682',
        PUBLIC_PARTNER_KEY: 'e6c6d1e079fbf9591a9b81b3b06cglzp',
        DEFAULT_APPID : "wxe30b001f4a755043",
        DEFAULT_SECRET : "aee5e6c6d1e079fbf9591a9b81b3b06c",
        DEFAULT_MATCH_ID: "1464695002",
        DEFAULT_PARTNER_KEY: 'e6c6d1e079fbf9591a9b81b3b06cjuta', //微信商户平台API密钥

    },
    GLOBAL: {
        GLOBAL_ROOM : "GLOBAL_ROOM",
        GLOBAL_CHANNEL_NAME:"GLOBAL_CHANNEL_NAME"
    },
    NET: {
        NONE :0,   //连接尚未建立
        OPEN : 1,   //WebSocket的链接已经建立+
        CLOSING: 2,  //WebSocket的连接正在关闭
        CLOSED: 3,     //WebSocket的连接正在关闭连接已经关闭或不可用
        PLAYER_LOGIN:4,  //频道玩家进入
        CHANNEL_INFO:5, //发送频道的所有房间数据列表
        ENTER_ROOM:6 //进入房间
    },
    LANGUAGE: {
        RECIEVE_CONNECT :"收到用户连接",
        OPEN_CONNECT:"与用户的连接已经建立",
        CLOSE_CONNECT:"用户断开连接",
        NO_SERVER:"没有服务器可以登陆",
        DUPLICATE_NAME:"玩家重名",
        LOGIN_SUCCESS:"登陆成功",
        NO_ENOUGH_CARD:"房卡不足，无法创建房间",
        BANGDING_INFO_NONE:"绑定信息不全，绑定失败",
        PLAYER_OFF_LINE:"玩家不在线",
        PLAYER_IN_ROOM:"玩家已经在其他房间中",
        YOU_ARE_IN_ROOM:"要加入其他房间请先退出该房间",
        DATA_WRONG:"请求错误",
        REFUSE_INVITE_GAME:"拒绝加入游戏",
        IS_ALREADY_FRIEND:"对方已经在好友列表中",
        IS_IN_INVITE_LIST:"对方已经收到邀请,请等待回复...",
        IS_ADD_SELF_FRIEND:"不能添加自己为好友",
        NO_PLAYER:"玩家不存在",
        YOU_AREA_IN_ROOM:"你已经在房间中"
    }
}