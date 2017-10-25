/**
 * Created by xieyq on 2017/6/13.
 */
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var util = require("util");
var utils = require('../util/utils');
var onLineDao = module.exports;
var pomelo = require("pomelo");

//添加房卡消耗记录
onLineDao.insertOnLineDate = function(onlinePlayer,fightRoom,readyRoom,maxPlayers){
    var dateNow = new Date(Date.now());
    var dateStr = dateNow.getFullYear() + "-" + (dateNow.getMonth() + 1) + "-" + dateNow.getDate() +" 23:59:55";
    var sql = "insert into online (playercount,roomcount,roomfight,max_players,time) values(?,?,?,?,?) ON DUPLICATE KEY UPDATE playercount = values(playercount)," +
        "roomcount = values(roomcount),roomfight = values(roomfight),max_players = values(max_players)";
    var args = [onlinePlayer,fightRoom + readyRoom,fightRoom,maxPlayers,dateStr];

    //console.log("insert online sql" + sql +" args:" + args);
    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err){
            logger.error('onLineDao err : ' + err.message);
        } else {
           // logger.info("onLineDao insertOnLineDate && success:\n" + JSON.stringify(res) );
        }
    });
}