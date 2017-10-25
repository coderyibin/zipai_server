var utils = module.exports;

// control variable of func "myPrint"
var isPrintFlag = false;
// var isPrintFlag = true;

/**
 * Check and invoke callback function
 */
utils.invokeCallback = function(cb) {
  if(!!cb && typeof cb === 'function') {
    cb.apply(null, Array.prototype.slice.call(arguments, 1));
  }
};

/**
 * clone an object
 */
utils.clone = function(origin) {
  if(!origin) {
    return;
  }

  var obj = {};
  for(var f in origin) {
    if(origin.hasOwnProperty(f)) {
      obj[f] = origin[f];
    }
  }
  return obj;
};

utils.size = function(obj) {
  if(!obj) {
    return 0;
  }

  var size = 0;
  for(var f in obj) {
    if(obj.hasOwnProperty(f)) {
      size++;
    }
  }

  return size;
};

// print the file name and the line number ~ begin
function getStack(){
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack) {
    return stack;
  };
  var err = new Error();
  Error.captureStackTrace(err, arguments.callee);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
}

function getFileName(stack) {
  return stack[1].getFileName();
}

function getLineNumber(stack){
  return stack[1].getLineNumber();
}

utils.myPrint = function() {
  if (isPrintFlag) {
    var len = arguments.length;
    if(len <= 0) {
      return;
    }
    var stack = getStack();
    var aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
    for(var i = 0; i < len; ++i) {
      aimStr += arguments[i] + ' ';
    }
    console.log('\n' + aimStr);
  }
};
// print the file name and the line number ~ end

utils.timestampToDate = function(timestamp){
  var date = new Date(timestamp);
  var month = date.getMonth();
  var hours = date.getHours();
  var miniuts=date.getMinutes();
  var seconds = date.getSeconds();
  var nowDate = date.getDate();
  var Y = date.getFullYear() + '-';
  var M = (month+1 < 10 ? '0'+(month+1) : month+1) + '-';
  var D = (nowDate < 10 ? '0' + nowDate: nowDate)+' ';
  var h = (hours <10 ? '0'+hours:hours)+ ':';
  var m = (miniuts<10 ? '0'+miniuts:miniuts)+':';
  var s = (seconds<10 ? '0'+seconds:seconds);
  return (Y+M+D+h+m+s+'');
}

utils.timestampToSimple = function(timestamp){
  var date = new Date(timestamp);
  var month = date.getMonth();
  var Y = date.getFullYear() + '-';
  var M = (month+1 < 10 ? '0'+(month+1) : month+1) + '-';
  var nowDate = date.getDate();
  var D = (nowDate < 10 ? '0' + nowDate: nowDate)+' ';
  return Y+M+D;
}

// split frient list to Arr
utils.splitToArr = function(str){
    var arr = str.match(/\;(\d+)\;/ig);
    if (!arr) {
      arr = [];
    }

    for (var i = 0; i < arr.length; i++) {
      arr[i] = arr[i].replace(/;/g,"");
    }
    return arr;
}