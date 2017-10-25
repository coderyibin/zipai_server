var xml2js = require('xml2js');


exports.parseXML = function(xml, fn){
	var parser = new xml2js.Parser({ trim:true, explicitArray:false, explicitRoot:false });
	parser.parseString(xml, fn||function(err, result){});
};

exports.buildXML = function(json){
	var builder = new xml2js.Builder();
	return builder.buildObject(json);
};

exports.mix = function(){
	var root = arguments[0];
	if (arguments.length==1) { return root; }
	for (var i=1; i<arguments.length; i++) {
		for(var k in arguments[i]) {
			root[k] = arguments[i][k];
		}
	}
	return root;
};

//创建订单需要的32位随机数
exports.generateNonceString = function(length){
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var maxPos = chars.length;
	var noceStr = "";
	for (var i = 0; i < (length || 32); i++) {
		noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
	}
	return noceStr;
};

//创建订单号
exports.generateOutTradeNo = function(length){
	var date = new Date(Date.now());
	var Y = date.getFullYear();
	var M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1);
	var D = date.getDate();

	var out_trade_no = Y + M + D+ Math.random().toString().substr(2, 10);

	return out_trade_no;
};

exports.getClientIp = function(req) {
    return req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
};
