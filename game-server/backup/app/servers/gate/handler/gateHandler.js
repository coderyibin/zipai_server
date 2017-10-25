/**
 * Created by xieyq on 2017/3/23.
 */
var dispatcher = require('../../../util/dispatcher');
var userDao = require("../../../dao/userDao");
var Code = require("../../../util/code");
module.exports = function(app)
{
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
};

//请求进入根据网关路由获取connector的ip和端口
Handler.prototype.queryEntry = function(msg,session,next) {
    // get all connectors
    var connectors = this.app.getServersByType('connector');
    if(!connectors || connectors.length === 0) {
        next(null, {
            code: Code.FAIL
        });
        return;
    }
    // select connector
    var res = dispatcher.dispatch(String(parseInt(Math.random() * 10000)), connectors);
    next(null, {
        code: Code.OK,
        host: res.clientHost,
        port: res.clientPort
    });
}