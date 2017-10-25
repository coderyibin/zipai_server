/**
 * Created by xieyq on 2017/7/4.
 *正式地址：https://buy.itunes.apple.com/verifyReceipt

 ​测试地址：https://sandbox.itunes.apple.com/verifyReceipt
 */
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

handler.iosBuy = function (msg,session,next){
    var payData =  msg.data;
    console.log("iosbuy client data" + util.inspect(payData));
    if(! payData || ! payData["receipt-data"]){
        next(null,{
            code:Code.IOS_PAY.IOS_PAY_ERROR
        });
    } else {
        IOSPayVerifier.verifyWithRetry(session.uid,payData["receipt-data"],function(err,userId,data){
            console.log("ios pay result" + util.inspect(data));
            if(! err && parseInt(data.status) == 0 && !! data && !! data["receipt"] && !!data["receipt"]["in_app"] &&  data["receipt"]["in_app"].length > 0){
                var resultDetail = data["receipt"]["in_app"][0];
                var orderId = resultDetail["transaction_id"];
                iosPayDao.selectOrder(orderId,userId,function(err,userId,result){
                    if(err || result){
                        next(null,{
                            code:Code.FAIL
                        });
                    } else {
                        iosPayDao.insertOrder(userId,resultDetail,function(err,result){
                            if(result){
                                var roomCard = 0;
                                switch(resultDetail["product_id"]){
                                    case "zipai.one":
                                        roomCard = 1;
                                        break;
                                    case "zipai.ten":
                                        roomCard = 10;
                                        break;
                                    case "zipai.twenty":
                                        roomCard = 20;
                                        break;
                                }
                                roleMgr.getUserInfo(null,userId,function(roleData){
                                    var fightCardCount = roleData.fightCardCount;
                                    console.log(userId + "iosPayHandler add Card" + roomCard);
                                    roleMgr.updateUserInfo(null,userId,{roomCard : (fightCardCount + roomCard)},true);
                                    userDao.update({fightCardCount : (fightCardCount + roomCard)}, userId);
                                });
                            }
                        })
                    }
                });
                next(null,{
                    code:Code.OK
                });
            } else {
                next(null,{
                    code:Code.FAIL
                });
            }

        });
    }
}
