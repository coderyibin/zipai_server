/**
 * Created by xieyq on 2017/3/24.
 */

var crc = require('crc');

module.exports.dispatch = function(uid, serverList) {
    var index = Math.abs(crc.crc32(uid)) % serverList.length;
    return serverList[index];
};