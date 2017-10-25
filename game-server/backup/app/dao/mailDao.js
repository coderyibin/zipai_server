/**
 * Created by xieyq on 2017/5/11.
 * 邮件信息
 */
var logger = require('pomelo-logger').getLogger('guilin', __filename);
var util = require("util");
var utils = require('../util/utils');
var resultDao = module.exports;
var pomelo = require("pomelo");

//获取某玩家的所有邮件信息
resultDao.getMailInfo = function(userID,start,num,cb){
    var sql = "SELECT * FROM mail where touid = ? or touid = ? order by time desc limit ?,?;"
    var args = [userID,"all",start,num];

    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err !== null){
            logger.error('mailDao err : ' + err.message);
            utils.invokeCallback(cb,err, null);
        } else {
            logger.info("mailDao getMainInfo && success:\n" + JSON.stringify(res) );
            var ret = [];
            if (res.length > 0) {
                for (var i = 0; i < res.length; i++) {
                    res[i].attach = JSON.parse(res[i].attach);
                    if(res[i].validtime.getTime() < Date.now())
                    {
                        //过期邮件不返回
                        continue;
                    }
                    ret.push(res[i]);
                }
                utils.invokeCallback(cb, null, ret);
            } else {
                utils.invokeCallback(cb, null, []);
            }
        }
    });
}

//获取单个邮件信息
resultDao.getMail= function(id,cb) {
    var sql = "SELECT * FROM mail where id = ?";
    var args = [id];
    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err !== null){
            logger.error('mailDao err : ' + err.message);
            utils.invokeCallback(cb,err, null);
        } else {
            logger.info("mailDao getMailInfo && success:\n" + JSON.stringify(res) );
            var ret = [];
            if (res.length > 0) {
                for (var i = 0; i < res.length; i++) {
                    res[i].attach = JSON.parse(res[i].attach);
                    ret.push(res[i]);
                }
                utils.invokeCallback(cb, null, ret);
            } else {
                utils.invokeCallback(cb, null, []);
            }
        }
    });
}

//更新某个邮件为已读
resultDao.readMail= function(id,cb) {
    var sql = "UPDATE mail SET readflag = 1 WHERE id = ?";
    var args = [id];
    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err !== null){
            logger.error('mailDao err : ' + err.message);
            utils.invokeCallback(cb,err, null);
        } else {
            logger.info("mailDao getMailInfo && success:\n" + JSON.stringify(res) );
            if (!!res && res.affectedRows>0) {
                logger.info('update readMail success!');
                utils.invokeCallback(cb,null,true);
            }else {
                logger.info('update readMail failed!');
                utils.invokeCallback(cb,null,false);
            }
        }
    });
}

//更新某个邮件附件已经领取
resultDao.getAttach= function(id,cb) {
    var sql = "UPDATE mail SET attachstatus = 1 WHERE id = ?";
    var args = [id];
    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err !== null){
            logger.error('mailDao err : ' + err.message);
            utils.invokeCallback(cb,err, null);
        } else {
            logger.info("mailDao getAttach && success:\n" + JSON.stringify(res) );
            if (!!res && res.affectedRows>0) {
                logger.info('update getAttach success!');
                utils.invokeCallback(cb,null,true);
            }else {
                logger.info('update getAttach failed!');
                utils.invokeCallback(cb,null,false);
            }
        }
    });
}

//检测玩家是否有未读邮件出现,返回有几封新邮件
resultDao.getUnreadMail = function(userId,cb)
{
    var sql = "SELECT * FROM mail where touid = ? and readflag = 0";
    var args = [userId];
    pomelo.app.get('dbclient').insert(sql, args, function(err,res){
        if(err !== null){
           // logger.error('mailDao err : ' + err.message);
            utils.invokeCallback(cb,err, 0);
        } else {
            //logger.info("mailDao getUnreadMail && success:\n" + JSON.stringify(res) );
           var length = res.length;
            if (res.length > 0) {
                for (var i = 0; i < res.length; i++) {
                    if(res[i].validtime.getTime() < Date.now())
                    {
                        length --;
                    }
                }
                utils.invokeCallback(cb, null, length);
            } else {
                utils.invokeCallback(cb, null, 0);
            }
        }
    });
}
