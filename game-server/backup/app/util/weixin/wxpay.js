var util = require('./util');
var request = require('request');
var md5 = require('MD5');


exports = module.exports = WXPay;

function WXPay() {
	
	if (!(this instanceof WXPay)) {
		return new WXPay(arguments[0]);
	};

	this.options = arguments[0];
	this.wxpayID = {
		appid  : this.options.appid, 
		mch_id : this.options.mch_id,
		partner_key : this.options.partner_key
	};

};


WXPay.mix = function(){
	switch (arguments.length) {
		case 1:
			var obj = arguments[0];
			for (var key in obj) {
				if (WXPay.prototype.hasOwnProperty(key)) {
					throw new Error('Prototype method exist. method: '+ key);
				}
				WXPay.prototype[key] = obj[key];
			}
			break;
		case 2:
			var key = arguments[0].toString(), fn = arguments[1];
			if (WXPay.prototype.hasOwnProperty(key)) {
				throw new Error('Prototype method exist. method: '+ key);
			}
			WXPay.prototype[key] = fn;
			break;
	}
};

//微信支付的签名
WXPay.mix('sign', function(param){

	var querystring = Object.keys(param).filter(function(key){
		return param[key] !== undefined && param[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key)<0;
	}).sort().map(function(key){
		return key + '=' + param[key];
	}).join("&") + "&key=" + this.options.partner_key;

	return md5(querystring).toUpperCase();
});

WXPay.mix('createUnifiedOrder', function(opts, fn){

	opts.nonce_str = opts.nonce_str || util.generateNonceString();
	util.mix(opts, this.wxpayID);
	opts.sign = this.sign(opts);

	opts.partner_key = null;

	request({
		url : "https://api.mch.weixin.qq.com/pay/unifiedorder",
		method : 'POST',
		body : util.buildXML(opts),
	}, function(err, response, body){
		if (err) {
			fn(err,body);
		}else{
			util.parseXML(body, fn);
		}
	});
});

WXPay.mix('queryOrder', function(query, fn){
	
	if (!(query.transaction_id || query.out_trade_no)) { 
		fn(null, { return_code: 'FAIL', return_msg:'缺少参数' });
	}

	query.nonce_str = query.nonce_str || util.generateNonceString();
	util.mix(query, this.wxpayID);
	query.sign = this.sign(query);

	query.partner_key = null;

	request({
		url: "https://api.mch.weixin.qq.com/pay/orderquery",
		method: "POST",
		body: util.buildXML({xml: query})
	}, function(err, res, body){
		util.parseXML(body, fn);
	});
});


WXPay.mix('get', function(key){
	var wxpayConfig = require('../../../config/wxpay.json')

	return this.wxpayID[key];
});

/*
	<xml>
		//应用APPID
	   	<appid>wx2421b1c4370ec43b</appid>
	   	//微信支付分配的商户号
	   	<mch_id>10000100</mch_id>
	   	//随机字符串，不长于32位。推荐随机数生成算法
		<nonce_str>1add1a30ac87aa2db72f57a2375d8fec</nonce_str>
		//签名，详见签名生成算法
	   	<sign>0CB01533B8C1EF103065174F50BCA001</sign>

	   	//商品描述交易字段格式根据不同的应用场景按照以下格式：
		APP——需传入应用市场上的APP名字-实际商品名称，天天爱消除-游戏充值。
	   	<body>APP支付测试</body>

	   	//商户系统内部的订单号,32个字符内、可包含字母, 其他说明见商户订单号
	   	<out_trade_no>1415659990</out_trade_no>
	   	//订单总金额，单位为分，详见支付金额
		<total_fee>1</total_fee>
		//	用户端实际ip
		<spbill_create_ip>14.23.150.211</spbill_create_ip>
		//接收微信支付异步通知回调地址，通知url必须为直接可访问的url，不能携带参数
	    <notify_url>http://wxpay.wxutil.com/pub_v2/pay/notify.v2.php</notify_url>
		<trade_type>APP</trade_type>

		// 附加数据，在查询API和支付通知中原样返回 深圳分店
	   <attach>支付测试</attach>
	</xml>
*/