/**
 * Created by xieyq on 2017/5/18.
 * 角色数据更新管理
 */
var GameConst = require("../../util/gameConstant");
var ClientNet = require("../../model/clientNet");
var roomLogger = require('pomelo-logger').getLogger('room', __filename, process.pid);
var pomelo = require('pomelo');
var utils = require('../../util/utils');
var exp = module.exports;
var roleDic = {};
var onlinePlayer = 0;
//上一次最高在线的记录时间
var lastDate = null;
//最高在线
var maxPlayers = 0;
exp.addRoleInfo = function(player) {
    if(! roleDic.hasOwnProperty(player.uid)){
        roleDic[player.uid] = player;
        onlinePlayer ++;
        if(onlinePlayer > maxPlayers){
            maxPlayers = onlinePlayer;
        }
        roomLogger.info("RoleMgr/addRoleInfo player add game name" + player.name +" uid:" + player.uid +" total:" +onlinePlayer);
    } else {
        roomLogger.info("RoleMgr/addRoleInfo player add game is already in name" + player.name +" uid:" + player.uid +" total:" +onlinePlayer);
    }
}

exp.delRoleInfo = function(uid) {
    if(roleDic.hasOwnProperty(uid)){
        delete roleDic[uid];
        onlinePlayer --;
        roomLogger.info("RoleMgr/delRoleInfo player leave game uid" + uid +" total:" +onlinePlayer);
    } else {
        roomLogger.info("RoleMgr/delRoleInfo player leave game is already in  uid" + uid +" total:" +onlinePlayer);
    }
}

/**
 *
 * @param uid  要更新的玩家uid
 * @param params  需要更新的属性｛属性：值｝
 */
exp.updateUserInfo = function(session,uid,params,send,cb) {
    pomelo.app.rpc.fight.roomRemote.updateUserInfo(session,uid,params,send,function(player) {
        utils.invokeCallback(cb,player);
    });
}

/**
 *
 * @param uid  需要获取的玩家id
 * @returns {*}  返回玩家信息
 */
exp.getUserInfo = function(session,uid,cb) {
    pomelo.app.rpc.fight.roomRemote.getPlayer(session,uid,function(player) {
        utils.invokeCallback(cb,player);
    });
}


exp.getRoleDicCount = function ()
{
    return onlinePlayer;
}

exp.getRoleMaxCount = function ()
{
    return maxPlayers;
}

exp.getRoleDic = function(){
   return roleDic;
}
//重置最高在线
exp.resetMaxCount = function(){
    if(! lastDate){
        lastDate = new Date(Date.now());
    } else {
        var nowDate = new Date(Date.now());
        if(nowDate.getDate() != lastDate.getDate()){
            maxPlayers = 0;
            lastDate = nowDate;
        }
    }
}