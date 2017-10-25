/**
 * Created by xieyq on 2017/5/22.
 * session获取
 */
var util =require("util");

module.exports = function() {

}
//获取session的IP
module.exports.getRemoteIPAddress = function(session) {
    var sessions = session.__sessionService__.sessions;
    var ip = sessions[session.id].__socket__.remoteAddress.ip;
    return ip.replace("::ffff:","");
}



//以下为web端获取 客户端IP 方法
exports.getClientIP = function(req){
    var ipAddress;
    var headers = req.headers;
    var forwardedIpsStr = headers['x-real-ip'] || headers['x-forwarded-for'];
    forwardedIpsStr ? ipAddress = forwardedIpsStr : ipAddress = null;
    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
}
