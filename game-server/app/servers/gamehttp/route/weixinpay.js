var logger = require('pomelo-logger').getLogger('guilin', __filename);
var WXPay = require('../../../util/weixin/wxpay');
var util = require('../../../util/weixin/util');
var numUtil = require('../../../util/numUtil');
var wxpayDao = require('../../../dao/wxpayDao');
var userDao = require('../../../dao/userDao');
var rechargeData = require('../../../util/dataApi').recharge;
var roleMgr = require('../../../domain/mgr/roleMgr');
var gameConst = require("../../../util/gameConstant");
var pomeloUtil = require("util");

var pomelo = require('pomelo');

module.exports = function(app, http) {
	//客户端首先通知服务端创建预支付定单,取得信息返回给客户端，供客户端调取微信支付窗口
	http.post('/unifiedOrder', function(req, res) {
		logger.info("unifiedOrder*******************")
		var nonce_str = util.generateNonceString();

		var total_fee = req.body.total_fee;
		var out_trade_no = util.generateOutTradeNo();
		var tradeType = req.body.trade_type;
		var userId = req.body.userId;
		console.log("get unifiedOrder from clinet" + pomeloUtil.inspect(req.body));
		if(! userId){
			userId = "1807";
		}
		userDao.getUserInfoByUserID(userId,function(err,player){
			if(err){
				res.send({
					code : 500,
					msg : "用户不存在"
				})
				return;
			}

			if(!tradeType) {
				tradeType = "APP";
			}
			var appid ;
			var mch_id;
			var partner_key;
			if(tradeType == "JSAPI") {
				appid = gameConst.DATA.PUBLIC_APPID;
				mch_id = gameConst.DATA.PUBLIC_MACH_ID;
				partner_key = gameConst.DATA.PUBLIC_PARTNER_KEY;
			} else {
				appid = gameConst.DATA.DEFAULT_APPID;
				mch_id = gameConst.DATA.DEFAULT_MATCH_ID;
				partner_key = gameConst.DATA.DEFAULT_PARTNER_KEY;
			}
			//mch_id,appid,partner_key已经在WXPay集成
			var wxpay = new WXPay({appid:appid,mch_id:mch_id,partner_key:partner_key});
			logger.info("unifiedOrder out_trade_no*******************===" + out_trade_no + "mch_id" + mch_id + " tradeType:"+ tradeType + " APPID" + appid);
			var params = {
				body : '新桂林字牌-微信支付',
				out_trade_no : out_trade_no,
				nonce_str : nonce_str,
				total_fee : total_fee * 100,
				spbill_create_ip : util.getClientIp(req),
				//微信 那边支付成功后会回调到这个地址
				notify_url : 'http://server.zp.xunlegame.com:3001/notify',
				trade_type : tradeType
			};
			if(tradeType == "JSAPI"){
				params["openid"] = player.openid;
			}
			wxpay.createUnifiedOrder(params, function(err, result){
				if (err) {
					logger.error("createUnifiedOrder err ::" + JSON.stringify(err));
					res.send({code : 500})
				}else{
					if (result.return_code == "SUCCESS" && result.result_code == "SUCCESS") {
						var timeStamp = Date.parse(new Date()) / 1000;
						logger.info(tradeType + "createUnifiedOrder APP result:" + pomeloUtil.inspect(result));
						if(tradeType == "JSAPI"){
							var JSAPIParams = {
								appId: appid,
								timeStamp:timeStamp,
								nonceStr: nonce_str,
								package: "prepay_id="+result['prepay_id'],
								signType: "MD5"
							}
							var jsAPIsign = wxpay.sign(JSAPIParams);
							res.send({
								code : 200,
								//## prepay_id是会话标识
								result : {'appid':appid, 'mch_id': mch_id, 'prepay_id': result['prepay_id'], 'nonce_str': nonce_str, 'time_stamp': timeStamp,  'sign':jsAPIsign , "out_trade_no" : out_trade_no}
							});
						} else {
							var appParams = {
								appid: appid,
								noncestr: nonce_str,
								package: "Sign=WXPay",
								partnerid: mch_id,
								prepayid: result['prepay_id'],
								timestamp:timeStamp
							}
							var appSign = wxpay.sign(appParams);

							res.send({
								code : 200,
								//## prepay_id是会话标识，后面必须得用上来判断标识
								result : {'appid':appid, 'mch_id': mch_id, 'prepay_id': result['prepay_id'], 'nonce_str': nonce_str, 'time_stamp': timeStamp, 'package_value':'Sign=WXPay', 'sign': appSign , "out_trade_no" : out_trade_no}
							});
						}
					}else{
						res.send({
							code : 500,
							msg : result.return_msg
						})
					}
				}
			});
		});
	});
   //微信支付成功微信服务器返回的消息
	http.post('/notify', function(req, res) {
		var body = req.body;
		logger.info("wxpay ##############################=" + JSON.stringify(body))


		if (body) {
			util.parseXML(body, function(err,result){
				if (result.return_code == "SUCCESS" && result.result_code == "SUCCESS") {
					logger.info("notify out_trade_no*******************===" + result.out_trade_no);

					var appid ;
					var mch_id;
					var partner_key;
					if(result.trade_type == "JSAPI") {
						appid = gameConst.DATA.PUBLIC_APPID;
						mch_id = gameConst.DATA.PUBLIC_MACH_ID;
						partner_key = gameConst.DATA.PUBLIC_PARTNER_KEY;
					} else {
						appid = gameConst.DATA.DEFAULT_APPID;
						mch_id = gameConst.DATA.DEFAULT_MATCH_ID;
						partner_key = gameConst.DATA.DEFAULT_PARTNER_KEY;
					}
					var wxpay = new WXPay({appid:appid,mch_id:mch_id,partner_key:partner_key});

					var rSign = result.sign;
					result.sign = null;
					var sign = wxpay.sign(result);

					if (sign == rSign) {
						logger.info("notify createOrder success 签名成功")

						// 成功
						res.send(util.buildXML({return_code : "SUCCESS",return_msg : "OK"}) );

						// 入库
						result.sign = rSign;
						wxpayDao.createOrder(result,function(err,ret) {
							if (err) {
								logger.error("notify createOrder ::" + err.stack)
							}
						});
					}else{
						logger.error("notify createOrder fail 签名失败")
						// 签名失败
						res.send(util.buildXML({return_code : "FAIL",return_msg : "签名失败"}) );
					}
				}else{
					// 微信notify传输失败
					res.send(util.buildXML({return_code : "FAIL",return_msg : "result_code fail"}) );
				}
			});
		}else{
			// 微信notify传输失败
			res.send(util.buildXML({return_code : "FAIL",return_msg : "传输数据为空"}) );
		}
	});

     //客户端发送订单号数据过来。表示是这个玩家在充值的
	http.post('/orderQuery', function(req, res) {
		logger.info("orderQuery ##############################=" + JSON.stringify(req.body));
		var out_trade_no = req.body.out_trade_no;

		var total_fee = req.body.total_fee;
		var userId = req.body.userId;
		var goldIndex = req.body.index;
		var tradeType = req.body.trade_type;

		if(!tradeType) {
			tradeType = "APP";
		}
		var appid ;
		var mch_id;
		var partner_key;
		if(tradeType == "JSAPI") {
			appid = gameConst.DATA.PUBLIC_APPID;
			mch_id = gameConst.DATA.PUBLIC_MACH_ID;
			partner_key = gameConst.DATA.PUBLIC_PARTNER_KEY;
		} else {
			appid = gameConst.DATA.DEFAULT_APPID;
			mch_id = gameConst.DATA.DEFAULT_MATCH_ID;
			partner_key = gameConst.DATA.DEFAULT_PARTNER_KEY;
		}
		var wxpay = new WXPay({appid:appid,mch_id:mch_id,partner_key:partner_key});

		logger.info("orderQuery goldIndex ::" + goldIndex);
		logger.info("orderQuery userId ::" + userId);

		var fangKa = rechargeData.findById(goldIndex).fangKa;
		var cost = rechargeData.findById(goldIndex).cost;

		logger.info("orderQuery fangKa ::" + fangKa);
		logger.info("orderQuery cost ::" + cost);


		// 去数据库查 看通知接口是否有数据
		wxpayDao.orderQuery(out_trade_no,function(err,result){
			if (err) {
				logger.error("orderQuery err ::" + err.stack);
			}else{
				if (result.length > 0) {
					//数据库中已经有此订单数据
					var order = result[0];

					if (order.userID != 0) {
						logger.error("WXPay.queryOrder you shuju ::userID" + order.userID );
						res.send({code : 500,msg : "该订单已经验证过了，无效订单"});
					}else{
							if(cost*100 == order.total_fee){
							roleMgr.getUserInfo(null,userId,function(roleData){
								logger.info("fightCardCount :" + JSON.stringify(roleData));

								var fightCardCount = roleData.fightCardCount;
								var firstChargeValue = 0;
								wxpayDao.updateUserID(userId,out_trade_no,fangKa);
								if(parseInt(numUtil.getTenToBinaryValue(roleData.firstCharge,6,goldIndex-1)) == 0){
									//首充
									fangKa += fangKa;
									firstChargeValue = numUtil.alertTenToBinaryValue(roleData.firstCharge,6,goldIndex-1,1);
								}

								if(firstChargeValue != 0 ){
									roleMgr.updateUserInfo(null,userId,{roomCard : (fightCardCount + fangKa),firstCharge : firstChargeValue},true);
									userDao.update({fightCardCount : (fightCardCount + fangKa),first_charge:firstChargeValue}, userId);
								} else {
									roleMgr.updateUserInfo(null,userId,{roomCard : (fightCardCount + fangKa)},true);
									userDao.update({fightCardCount : (fightCardCount + fangKa)}, userId);
								}

								res.send({code : 200,fangKa : (fightCardCount + fangKa)});
							});

						}else{
							logger.error("WXPay.queryOrder you shuju ::total_fee金额不对，无效订单::" + order.total_fee );
							res.send({code : 500,msg : "金额不对，无效订单"});
						}
					}
				}else{
					// 如果通知接口数据失败，即没有订单数据存入数据库的话， 则用微信订单查询接口查询 ==========底下目测有问题。以实际情况为主。感觉noncStr 和生成的sinal跟以前传给微信的是不一样的。觉得微信服务器应该query不到
					wxpay.queryOrder({
						out_trade_no : out_trade_no,
					},function(err, result){
						if (err) {
							logger.error("WXPay.queryOrder err ::" + err.stack);
						}else{
							if (result.return_code == "SUCCESS" && result.result_code == "SUCCESS") {

								var rSign = result.sign;
								result.sign = null;
								var sign = wxpay.sign(result);

								if (sign == rSign) {
									if (result.trade_state == "SUCCESS") {
										if(cost*100 == result.total_fee){
											// 入库
											result.sign = rSign;
											wxpayDao.createOrder(result,function(err,ret) {
												if (err) {
													logger.error("orderQuery createOrder ::" + err.stack)
													res.send({code : 500,msg : "orderQuery createOrder"});

												}else{
													// 成功
													roleMgr.getUserInfo(null,userId,function(roleData){
														var fightCardCount = roleData.fightCardCount;
														var firstChargeValue = 0;
														if(parseInt(numUtil.getTenToBinaryValue(roleData.firstCharge,6,goldIndex-1)) == 0){
															//首充
															fangKa += fangKa;
															firstChargeValue = numUtil.alertTenToBinaryValue(roleData.firstCharge,6,goldIndex-1,1);
														}

														wxpayDao.updateUserID(userId,out_trade_no,fangKa);
														if(firstChargeValue != 0 ){
															roleMgr.updateUserInfo(null,userId,{roomCard : (fightCardCount + fangKa),firstCharge : firstChargeValue},true);
															userDao.update({fightCardCount : (fightCardCount + fangKa),first_charge:firstChargeValue}, userId);
														} else {
															roleMgr.updateUserInfo(null,userId,{roomCard : (fightCardCount + fangKa)},true);
															userDao.update({fightCardCount : (fightCardCount + fangKa)}, userId);

														}

														res.send({code : 200,fangKa : (fightCardCount + fangKa)});
													});
												}
											});
										}else{
											logger.error("WXPay.queryOrder you shuju2 ::total_fee金额不对，无效订单::" + order.total_fee );

											res.send({code : 500,msg : "金额不对，无效订单"});
										}

									}else{
										logger.error("验证错误：" + result.trade_state );
										res.send(util.buildXML({code : 500,msg : result.trade_state}) );
									}
								}else{
									logger.error("orderQuery createOrder fail 签名失败")
									// 签名失败
									res.send(util.buildXML({code : 500,msg : "签名失败"}) );
								}
							}else{
								logger.error("orderQuery createOrder fail :" + result.return_msg)
								res.send({code : 500,msg : result.return_msg});
							}
						}
					})
				}
			}
		})
	});
};

