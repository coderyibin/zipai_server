/**
 * Created by xieyq on 2017/7/4.
 * IOS 内购主要操作
 */
//正式地址验证地址
var productUrl = "buy.itunes.apple.com";
//沙盒验证地址
var sandBoxUrl = "sandbox.itunes.apple.com";
/*
 verifyWithRetry the receipt
 */
var https = require("https");
var util = require("util");

IAPVerifier = module.exports;

IAPVerifier.verifyWithRetry = function(uid,receipt, cb) {
    var encoded = null, receiptData = {};
    encoded = receipt.toString('base64');
    receiptData['receipt-data'] = encoded;
    var userId = uid;
    console.log("convert base 64" + util.inspect(encoded));
    var options = this.requestOptions();
    console.log("to go to url" + options.host);
    return this.verify(receiptData, options, (function(_this) {
        return function(error, data) {
            if (error) {
                return cb(error);
            }
            if (parseInt(data.status) == 21007) {
                options.host = sandBoxUrl;
                return _this.verify(receiptData, options, function(err, data) {
                    return cb(err, userId,data);
                });
            } else if (parseInt(data.status) == 0){
                return cb(error, userId,data);
            } else {
                return cb(error, data);
            }

        };
    })(this));
};


/*
 verify the receipt data
 */

IAPVerifier.verify = function(data, options, cb) {
    var post_data, request;
    post_data = JSON.stringify(data);
    options.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
    };
    var request = https.request(options, (function(_this) {
        return function(response) {
            var response_chunk = [];
            response.on('data', function(data) {
                if (response.statusCode !== 200) {
                    return cb(new Error("response.statusCode != 200"));
                }
                response_chunk.push(data);
            });
            return response.on('end', function() {
                var responseData, totalData;
                totalData = response_chunk.join('');
                try {
                    responseData = JSON.parse(totalData);
                } catch (_error) {
                    return cb(_error);
                }
                return cb(null, responseData);
            });
        };
    })(this));
    request.write(post_data);
    request.end();
    request.on('error', function (exp) {
        console.log('problem with request: ' + exp.message);
    });
};


IAPVerifier.requestOptions = function() {
    return options = {
        host: productUrl,
        port: 443,
        path: '/verifyReceipt',
        method: "POST",
        rejectUnauthorized: false/*不加：返回证书不受信任CERT_UNTRUSTED*/
    };
};
