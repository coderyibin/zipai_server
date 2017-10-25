/**
 * Created by xieyq on 2017/5/12.
 */
//二进制和十进制相互转换以及取值的工具类
var numUtil = module.exports;


numUtil.tenToBinary = function(tenNum,count){
   var binaryStr = tenNum.toString(2);
    var dis = count - binaryStr.length;
    var preStr = "";
    for(var i = 0 ;i < dis;i ++){
        preStr +="0"
    }
   return preStr + binaryStr;
}

numUtil.binaryToTen = function(binaryStr){
    return parseInt(binaryStr,2)
}

//获取十进制转二进制然后第几位数据,index从0 开始 从右开始算起
numUtil.getTenToBinaryValue = function (tenNum,count,index)
{
   var binaryStr = numUtil.tenToBinary(tenNum,count);
    var nowIndex = binaryStr.length-(1+index);
    if(nowIndex < 0){
        nowIndex = 0;
    }
   return parseInt(binaryStr.substr(nowIndex,1));
}

//修改十进制数转二进制后 其中某个值，然后再转为十进制返回 index从0 开始  从右开始算起
numUtil.alertTenToBinaryValue = function (tenNum,count,index,value)
{
    var binaryStr = numUtil.tenToBinary(tenNum,count);
    var nowIndex = binaryStr.length-(1+index);
    if(nowIndex < 0){
        nowIndex = 0;
    }
    var preStr =  "";
    if(nowIndex > 0){
        preStr = binaryStr.substring(0,nowIndex);
    }
    var midStr = binaryStr.substr(nowIndex,1);
    midStr = value;
    var lastStr = "";
    if(nowIndex < binaryStr.length){
        lastStr =  binaryStr.substring(nowIndex+1,binaryStr.length);
    }
    var nowBinary = preStr + midStr.toString() + lastStr;
   return numUtil.binaryToTen(nowBinary);
}