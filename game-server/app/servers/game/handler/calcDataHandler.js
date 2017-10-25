/**
 * Created by xieyq on 2017/7/29.
 */
//台增加功能：主动分享次数，房间分享次数，下载界面打开次数，H5界面打开次数，IOS活跃，安卓活跃，H5活跃
var IOSPayVerifier = require("../../../util/IOSPayVerifier");
var Code = require("../../../util/code");
var iosPayDao = require("../../../dao/iosPayDao");
var userDao = require('../../../dao/userDao');
var roleMgr = require('../../../domain/mgr/roleMgr');

var util = require("util");
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService =  this.app.get('channelService');
}

var handler = Handler.prototype;

