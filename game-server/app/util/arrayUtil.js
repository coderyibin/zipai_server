/**
 * Created by xieyq on 2017/3/31.
 * 数组工具
 */

module.exports = function() {

}


module.exports.sortNumber = function(a,b) {
    return a - b;
}

//对比两个数组是否一样。
module.exports.equalArr = function(arr1,arr2) {
    arr1 = arr1.sort(this.sortNumber);
    arr2 = arr2.sort(this.sortNumber);
    //return true;
    if(arr1.length != arr2.length) {
        return false;
    }
    for(var i =0;i < arr1.length;i ++) {
        if(parseInt(arr1[i]) != parseInt(arr2[i])) {
            return false;
        }
    }
    return true;
}

//循环输出一对像的值
module.exports.logObject = function(obj) {
    for(var prop in obj) {
        console.log("属性名"+prop+"值:"+obj[prop]);
    }
}

module.exports.logObject = function(obj) {
    for(var prop in obj) {
        console.log("属性名"+prop+"值:"+obj[prop]);
    }
}
//将[[],[]]数组转化为int型
module.exports.parseIntDebugArr = function(arr) {
    if(! arr) return null;
    for (var i = 0; i < arr.length; i++) {
        for(var j = 0;j < arr[i].length;j ++) {
            arr[i][j] = parseInt(arr[i][j]);
        }
    }
    return arr;
}


