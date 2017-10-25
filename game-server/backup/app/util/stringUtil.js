/**
 * Created by xieyq on 2017/5/12.
 * 字符串工具
 */
module.exports = function() {

}

module.exports.getRandomString = function () {
    var str = parseInt(Math.random() * 10000) + generateMixed(4);
    return str;
}

var generateMixed = function (n) {
    var chars = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    var res = "";
    for(var i = 0; i < n ; i ++) {
        var id = Math.ceil(Math.random()*35);
        res += chars[id];
    }
    return res;
}