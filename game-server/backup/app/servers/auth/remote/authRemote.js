/**
 * Created by xieyq on 2017/5/3.
 * 验证账号服务器
 */
var userDao = require("../../../dao/userDao");
var Code = require("../../../util/code");
var authLogger = require('pomelo-logger').getLogger('auth', __filename,process.pid);
var request = require("request");
var util = require("util");
var GameConst = require("../../../util/gameConstant");
//如果是调试版本 默认账号都可以进入
var isDebug = false;
module.exports = function(app) {
    return new Remote(app);
};

var Remote = function(app) {
     this.app = app;
    this.channelService = app.get('channelService');
};

var pro = Remote.prototype;

/**
 * Auth token and check whether expire.
 *
 * @param  {String}   token token string
 * @param  {Function} cb
 * @return {Void}
 */
/*
正确返回
{
    "access_token":"ACCESS_TOKEN",                 接口调用凭证
    "expires_in":7200,                             接口调用凭证超时时间，单位（秒）
    "refresh_token":"REFRESH_TOKEN",               用户刷新access_token
    "openid":"OPENID",                             授权用户唯一标识
    "scope":"SCOPE",                               用户授权的作用域，使用逗号（,）分隔
    "unionid":"o6_bmasdasdsad6_2sgVt7hMZOPfL"     只有在用户将公众号绑定到微信开放平台帐号后，才会出现该字段。
}
错误返回样例：
{"errcode":40029,"errmsg":"invalid code"}
 */
pro.auth = function(authCode,token,openId,refreshToken,username,ipAddress,isPublicWeb,cb) {
    authLogger.info("one player enter" + token + "isPulicWeb" + isPublicWeb);
    if(token == "debug") {
        this.isDebug = true;
    } else {
        this.isDebug = false;
    }
    var self = this;
    if(this.isDebug) {
        self.requestUserInfo(null, username,null,ipAddress,cb);
        return;
    }
    var request = require('request');
    var authUrl;
    authLogger.info("client login date: token" + token + " authCode:"+authCode +" openId:"+ openId + " refreshToken:"+refreshToken +"username:"+username);
    var nowAPPID = GameConst.DATA.DEFAULT_APPID;
    var nowAppSecret = GameConst.DATA.DEFAULT_SECRET;
    if(isPublicWeb){
        nowAPPID = GameConst.DATA.PUBLIC_APPID;
        nowAppSecret = GameConst.DATA.PUBLIC_SECRET;
    }
    if(!! token){
        //客户端附带token，直接授权
        authUrl = "https://api.weixin.qq.com/sns/auth?access_token=" + token + "&openid=" + openId;
        request(authUrl, function (error, response, body) {
            if(error) {
                authLogger.error("loginWXError to auth" + error);
                cb(null,Code.ENTRY.WX_LOGIN_ERROR_AUTH);
            }
            body = JSON.parse(body);
            if(body.hasOwnProperty("errcode") && parseInt(body["errcode"]) != 0) {
                authUrl = "https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=" + nowAPPID + "&grant_type=refresh_token&refresh_token="+ refreshToken;
                request(authUrl, function (error, response, body) {
                    if(error) {
                        authLogger.error("loginWXError refresh token" + error);
                        cb(null,Code.ENTRY.WX_LOGIN_ERROR_REFRESH_AUTH);
                    }
                    body = JSON.parse(body);
                    if(body.hasOwnProperty("errcode")){
                        authLogger.info("loginFAILED refresh token" + token);
                        cb(null,Code.ENTRY.WX_LOGIN_FAILED_FRESH_AUTH);
                     } else {
                        self.requestUserInfo(body["access_token"], body["openid"],body["refresh_token"],ipAddress,cb);
                    };
                });
            } else {
                self.requestUserInfo(token, openId,refreshToken,ipAddress,cb)
            }
        });
    } else {
        //需要拉取授权码
        authUrl = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=" + nowAPPID + "&secret=" + nowAppSecret + "&code="+authCode+"&grant_type=authorization_code";
        request(authUrl, function (error, response, body) {
            if(error) {
                authLogger.error("loginWXError" + error);
                cb(null,Code.ENTRY.WX_LOGIN_ERROR_CODE);
            }
            body = JSON.parse(body);
            authLogger.info("request only Code :" + util.inspect(body));
            if(body.hasOwnProperty("errcode")) {
                authLogger.info("loginFAILED" + token);
                cb(null,Code.ENTRY.WX_LOGIN_FAILED_CODE);
            } else {
                self.requestUserInfo(body["access_token"], body["openid"],body["refresh_token"],ipAddress,cb)
            }
        });
    }
};

/*
 正确示例
 {
 "openid":"OPENID",  普通用户的标识，对当前开发者帐号唯一
 "nickname":"NICKNAME",  普通用户昵称
 "sex":1,  普通用户性别，1为男性，2为女性
 "province":"PROVINCE", 普通用户个人资料填写的省份
 "city":"CITY",普通用户个人资料填写的城市
 "country":"COUNTRY",国家，如中国为CN
 "headimgurl": "http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/0",用户头像，最后一个数值代表正方形头像大小（有0、46、64、96、132数值可选，0代表640*640正方形头像），用户没有头像时该项为空
 "privilege":[   用户特权信息，json数组，如微信沃卡用户为（chinaunicom）
 "PRIVILEGE1",
 "PRIVILEGE2"
 ],
 "unionid": " o6_bmasdasdsad6_2sgVt7hMZOPfL"  用户统一标识。针对一个微信开放平台帐号下的应用，同一用户的unionid是唯一的。
 }
 错误示例
 {
 "errcode":40003,"errmsg":"invalid openid"
 }
 */
pro.requestUserInfo = function(accessToken,openId,refreshToken,ipAddress,cb)
{
    if(this.isDebug) {
        userDao.register( {"nickname":openId,"ipAddress":ipAddress},function(err,params){
            if (err) {
                new Error(err),
                    cb(null, Code.FAIL);
                return;
            } else {
                cb(null,Code.OK,params);
            }
        });
        return;
    }
    var getInfoUrl =  "https://api.weixin.qq.com/sns/userinfo?access_token=" + accessToken + "&openid=" + openId;
    authLogger.info("autRemote/requestUserInfo req:"+getInfoUrl);
    request(getInfoUrl,function(error,response,body) {
        authLogger.info("login player:"+util.inspect(body));
        console.log();
        if(error) {
            authLogger.error("getInfoWX_Error" + error);
        }
        body = JSON.parse(body);
        if(body.hasOwnProperty("errcode")) {
            authLogger.info("getInfoWX_FAILED" + accessToken);
        }
        body["ipAddress"] = ipAddress;
        authLogger.info("autRemote/requestUserInfo:"+util.inspect(body));
        userDao.register( body,function(err,params){
            console.log("getInfo user by userDao" + params);
            params["token"] = accessToken;
            params["openId"] = openId;
            params["refreshToken"] = refreshToken;
            authLogger.info("login success accessToken:" + accessToken + " openId:"+openId + "refreshToken:"+refreshToken);
            if (err) {
                new Error(err),
                    cb(null, Code.FAIL);
                return;
            } else {
                cb(null,Code.OK,params);
            }
        });
    });
}

/**
 * Check the token whether expire.
 *
 * @param  {Object} token  token info
 * @param  {Number} expire expire time
 * @return {Boolean}        true for not expire and false for expire
 */
var checkExpire = function(token, expire) {
    if(expire < 0) {
        // negative expire means never expire
        return true;
    }

    return (Date.now() - token.timestamp) < expire;
};

