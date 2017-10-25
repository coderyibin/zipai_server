/**
 * Created by xieyq on 2017/3/22.
 */
var ArrayUtil = require("../util/arrayUtil");
var Rule = require("./rule");
var util = require("util");
var resultDao = require("../dao/resultDao");
var userDao = require("../dao/userDao");
module.exports = function (roomId,channelService) {
    return new GameRoom(roomId,channelService);
}

var GameRoom = function (roomId,channelService) {
    this.roomId = roomId;
    this.channelService = channelService;
    this.status= "empty";  //房间状态  empty waiting full  fight //分别代表空房间，等待玩家，满了，已经开始
    this.userList = []; //用户列表存放的player对象
    this.userOrderList = [null,null,null];//用户邻居处理的数组
    this.lordPlayer = null;//庄
    this.currPlayer = null; //当前出牌玩家
    this.playerCreator = null ;//房主
    this.card = null; //该房间牌对象
    this.prepareList = []; //战斗布局完毕的对象
    this.juShu = 0 ; //局数设定  可选择相应局数，10,15,20,30, 5
    this.minHu = 0; // 胡牌规则  10胡起胡或15胡起胡
    this.ziShu = 0;//子数算法  5胡1子或3胡1子
    this.ziMo = 0 ; //自摸设置  自摸翻倍或自摸+1子 1代表翻倍，2代表+1子
    this.fanXing =[] ;//翻醒设置 上 中  下醒   1为上，2为中，3为下
    this.currMatchResult = null;//当前出牌后的匹配结果。。等客户端确定要操作请求过来后得处理uid = [{type:1,cardArr:[[]]}]
    //waitLorder 等待选庄 waitPost等待出牌，  waitAuto 等待出底牌,waitAct 等待玩家回应,waitFanXing 等待翻醒  waitResult等待一局结算  waitEnd等待十局结算 waitNext等待下一局请求 ,
    // over代表总结算结束waitCalc计算当前出牌各玩家的结果
    this.gameStatus = "inFree";
    this.cardStatus ="none"; //none auto post 代表没状态，摸牌，出牌
    this.currCardId = 0 ;//当前房间的当前出牌的序号
    this.timeOutReleaseId = null;  //3分钟后解散房间的标识
    this.cardEffectTimeID = null; //房间牌面效果等待时间  服务器主动触发卡牌响应状态的延迟时间
    this.chongZhaoTimeId = null ; //重招下一个玩家的延迟
    this.winNextTimeId = null; //下一局开局的延迟
    this.waitUidList = []; //需要等待回应的玩家的uid  倒计时时间到得自动清除
    this.actRequestWait = {}; //玩家碰吃等操作的集合，因为有优先级,即为等待集合  uid = {type: 1,cardArr:[]}
    this.postNum = 0; //当前第几次出牌，用于判断地胡可以用
    this.debugCard = null; //调试用的牌
    this.oneFightResult = null;//每局的结果{uid:{type:type,fromUid:fromUid,xing:0,huShu:player.currFightHuShu,cardArr:cardArr,ziNum,id:cardId}}
    this.eachFightResult = [];//每局结果的存储 [{uid:4,uid:-1,uid:-3},{...}]
    this.fightResult = null; // 总局的结果  {uid:{11:2 ,12:3,ziShu:}} 代表天胡几次平胡几次还有子数输赢存数据库时得多加 head:1,name:userName ,头像和名字
    this.sqlEach = []; //数据库存的每单局的结果
    this.winerList = []; //每一局赢的玩家的uid列表
    this.nowWinPlayer = null; //这次赢的玩家
    this.requestNextList = [];//申请开始下一局的玩家列表
    this.releaseRoomList = []; //同意解散的列表
    this.readyList = [];//准备的玩家列表
    this.currCircle = 0 ;//当前的局数  1代表第一局 每局开始后+1
    this.xingCard = [];//当前翻醒的牌
    this.actTime = Date.now();//房间当前有交互的最后时间
    this.releasePlayer = null;//主动请求解散的玩家
    this.chatMsg = []; //房间聊天信息
    this.cardPassTime = 0; //这个房间收到cardPass的时间，用来限制连续发cardpass导致出牌异常问题
    this.winTime = 0; //赢的时间戳
}

var Prototype = GameRoom.prototype;


//设置字牌庄 ，即档牌 设置左右家得在前
Prototype.setLordUser = function () {
    if (this.userList.length != 3) {
        return;
    }
    this.lordPlayer.uIndex = 1;
    this.lordPlayer.rightPlayer.uIndex = 2;
    this.lordPlayer.leftPlayer.uIndex = 3;
}

//设置玩家的左右对手
Prototype.setNeighbor = function () {
    var uid0 = null;
    var uid1 = null;
    var uid2 = null;
    if(this.userOrderList[0] != null) {
        uid0 = this.userOrderList[0].uid;
    }
    if(this.userOrderList[1] != null) {
        uid1 = this.userOrderList[1].uid;
    }
    if(this.userOrderList[2] != null) {
        uid2 = this.userOrderList[2].uid;
    }
    if(this.userOrderList[0] != null) {
        this.userOrderList[0].leftPlayer = uid2;
        this.userOrderList[0].rightPlayer = uid1;
    }
    if(this.userOrderList[1] != null) {
        this.userOrderList[1].leftPlayer = uid0;
        this.userOrderList[1].rightPlayer = uid2;
    }
    if(this.userOrderList[2] != null) {
        this.userOrderList[2].leftPlayer = uid1;
        this.userOrderList[2].rightPlayer = uid0;
    }
}


//分牌
Prototype.setCardlist = function (cardlist) {
    for(var i = 0;i <  this.userList.length;i ++) {
        this.userList[i].handCardList = cardlist[i].slice(0);
        //处理若玩家有两龙的时候  补给玩家一张，，三龙则直接判断胡牌
        if(Rule.haveTwoLong(this.userList[i].handCardList)) {
            var nextId = this.getNextCard();
            if (nextId != -1) {
                this.userList[i].handCardList.push(nextId);
            }
        }
    }
}

//获取底牌的第一张牌
Prototype.getNextCard = function() {
    if (this.card.remainCard.length > 0) {
        var nextId = this.card.remainCard.shift();
        this.card.postCard.push(nextId);
        return nextId;
    } else {
        return -1;
    }
}

//获取下一个玩家的uid
Prototype.getNextPlayer = function() {
    for(var i = 0;i < this.userList.length;i ++) {
        if(this.userList[i].uid == this.currPlayer.rightPlayer) {
            return this.userList[i];
        }
    }
    return null;
}



//设置所有玩家进入等待回应列表
Prototype.setAllWait = function() {
    this.waitUidList = [];
    for(var i = 0;i < this.userList.length;i ++) {
        if(! this.userList[i].isLost) {
            this.waitUidList.push(this.userList[i].uid);
        }
    }
}


//设置所有的actRequest请求放在队列内以查看哪个先执行
//type:类型，cardArr:数组,uid请求进来的玩家ID  指令中有关棋牌中的type值均为1为开招，2为扫的开招，3为碰，4为吃，5为手牌的重招，6为扫的重招,7代表过扫，8代表扫,9代表扫穿
//暂时先忽略胡的问题
Prototype.handleActRequest = function(msg,uid) {
    var type = msg.type;
    var obj;
    var arr = [];
    var havePriority = false;
    if(type >= 10) {
        //胡的处理直接优先,这边暂时没有校验点击胡时扫比胡更早
        return true;
    }
    if(this.isAutoAct(type)) {
        //开招，扫的开招，碰，吃，重招，扫的重招，过扫，扫穿等不需要等待
        return true;
    }
    if(type == 3 || type == 4) {
        //碰或吃的话。看下有没有上面其他的情况
        //是否有其他优先级
        havePriority = false;
        for(obj in this.currMatchResult) {
            arr = this.currMatchResult[obj];
            for (var i = 0; i < arr.length; i++) {
                if (this.isAutoAct( arr[i].type)) {
                    havePriority = true;
                    break;
                }
            }
        }
        if(havePriority) {
            return false;
        }
    }
    if(msg.type == 4) {
        //吃的话判断是否有碰
        havePriority = false;
        for (obj in this.currMatchResult) {
            arr = this.currMatchResult[obj];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].type == 3) {
                    if(uid != obj) {
                        havePriority = true;
                    }
                }
                else if(arr[i].type == 4 ) {
                    if (obj == this.currPlayer.uid && (uid != this.currPlayer.uid)) {
                        havePriority = true;
                    }
                }
            }
        }
        if (havePriority) {
            this.actRequestWait[uid] = msg;
            return false;
        } else {
            return true;
        }
    }
    return true;
}

Prototype.deletePengMatch = function(type,player) {
    if(type == 4){
        var arr = this.currMatchResult[player.uid];
        var del = false;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].type == 3) {
                arr.splice(i,1);
                del = true;
            }
        }
        this.currMatchResult[player.uid] = arr;
        return del;
    }
}

//哪些是属于自动触发的
Prototype.isAutoAct = function(type) {
    if(type == 1 || type == 2 || type == 5 || type ==6 || type == 7 || type == 8 || type == 9 ||  type == 91 || type == 31 || type == 32 || type == 10 ||  type == 101) {
        //开招，扫的开招，碰，吃，重招，扫的重招，过扫，扫穿等不需要等待
        return true;
    } else {
        return false;
    }
}

//判断是否有等待指令
Prototype.haveActWait = function() {
    var index = 0;
    for(var obj in this.actRequestWait) {
        index++;
        break;
    }
    return index > 0;
}

//处理当有指令忽略后的事情
//player,忽略指令的玩家
Prototype.handlerActPass = function(player) {
    var pengHave = this.hasPengMatch(player.uid,3);
    if(!! pengHave) {
        player.ignorPengList.push(this.currCardId);
    }
    var chiHave = this.hasPengMatch(player.uid,4);
    if(chiHave) {
        player.ignorChiList.push(this.currCardId);
    }
}

//检测一遍等待指令是否可以执行
Prototype.doneActWait = function() {
    var canAct = false;
    for(var obj in this.actRequestWait) {
        canAct = this.handleActRequest(this.actRequestWait[obj],obj);
        if(canAct)
        {
            return {uid:obj,msg:this.actRequestWait[obj]};
        }
    }
    return null;
}

//判断玩家匹配中是否有碰或吃
Prototype.hasPengMatch = function(uid,type) {
    if(!! this.currMatchResult[uid]) {
        var arr =  this.currMatchResult[uid];
        for(var i = 0;i < arr.length;i ++) {
            if(arr[i].type == type) {
                return true;
            }
        }
    }
    return null;
}

//判断玩家请求的消息是否跟 匹配的一致
Prototype.checkMsgOk = function(msg,uid) {
    var cardIdArr = msg.cardArr;
    var matchArr = this.currMatchResult[uid];
    var xiahuoArr;
    var tempObj;
    for (var i = 0; i < matchArr.length; i++) {
        tempObj = matchArr[i];
        if (Rule.isHuType(msg.type)) {
            //胡的判断需要合法性
            if(parseInt(tempObj.type) == parseInt(msg.type)) {
                return true;
            }
        } else {
            for (var j = 0; j < tempObj.cardArr.length; j++) {
                if (parseInt(tempObj.type) == parseInt(msg.type) && ArrayUtil.equalArr(tempObj.cardArr[j], cardIdArr)) {
                    if (msg.hasOwnProperty("xiahuo")) {
                        xiahuoArr = tempObj.xiahuo[j];
                        if (!!xiahuoArr) {
                            for (var k = 0; k < xiahuoArr.length; k++) {
                                if (parseInt(msg.type) == 4 && ArrayUtil.equalArr(msg.xiahuo, xiahuoArr[k])){
                                    //下伙跟数组索引一致
                                    return true;
                                }
                            }
                        }
                    } else {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

//获取房间主要信息回调给客户端
Prototype.getClientInfo = function() {
    var param = {
        roomId:this.roomId,
        juShu:this.juShu,
        minHu:this.minHu,
        ziShu:this.ziShu,
        ziMo:this.ziMo,
        fanXing:this.fanXing,
        creatorUid:this.playerCreator.uid,
        readyList:this.readyList,
        circle:this.currCircle,
        chatMsg: this.chatMsg
    }
    if(!! this.lordPlayer) {
        param["lordPlayer"] = this.lordPlayer.uid;
    }
    if(!! this.card) {
        param["remainNum"] = this.card.remainCard.length;
    }
    return param;
}


//胡后存储胡的结果，也就是胡后 一局结束后的数据处理
Prototype.setOneFightResult = function(player,type,fromUid,cardArr,cardId) {
    if(! this.oneFightResult) {
        this.oneFightResult = {};
    }
    this.oneFightResult[player.uid] = {type:type,fromUid:fromUid,xing:0,huShu:player.currFightHuShu,cardArr:cardArr,id:cardId,eachHu:player.currEachHuList};
}

//一局翻醒后的结果
Prototype.addOneXingResult = function(xingArr) {
    var xing = 0;
    for(var i = 0 ;i < xingArr.length;i ++) {
        xing += xingArr[i];
    }
    var tempObj;
    for(tempObj in this.oneFightResult) {
        this.oneFightResult[tempObj]["xing"] += xing;
    }
    if(this.gameStatus == "waitResult") {
        var valueObject;
        var ziNum = 0;
        for(tempObj in this.oneFightResult) {
            valueObject = this.oneFightResult[tempObj];
            ziNum = this.calcZiNum(valueObject.type,valueObject.xing,valueObject.huShu);
            this.oneFightResult[tempObj]["ziNum"] = ziNum;
            this.setFightResult(tempObj,valueObject.type,ziNum,valueObject.xing,valueObject.fromUid);
        }
    }
}

//设置总结果的数据
Prototype.setFightResult = function(uid,type,ziNum,xingNum,fromUid) {
    if (!this.fightResult) {
        this.fightResult = {};
    }
    var i = 0;
    var eachObj = {};
    for (i = 0; i < this.userList.length; i++) {
        eachObj[this.userList[i].uid] = 0;
        if (!this.fightResult[this.userList[i].uid]) {
            this.fightResult[this.userList[i].uid] = {};
        }
    }
    //11代表普通胡牌，12代表点炮，13代表自摸,14代表天胡, 15代表地胡，16代表三龙五坎
    //平胡 自摸  点炮 总翻醒  天胡 地胡 三龙五坎  子数输赢多少

    var obj = this.fightResult[uid];
    if (! obj.hasOwnProperty(type)){
        obj[type] = 0;
    }
    if (! obj.hasOwnProperty("xing")) {
        obj["xing"] = 0;
    }
    if (! obj.hasOwnProperty("ziShu")) {
        obj["ziShu"] = 0;
    }
    if (type == 12 || type == 15) {
        if (!this.fightResult[fromUid].hasOwnProperty("12")) {
            this.fightResult[fromUid]["12"] = 0;
        }
        this.fightResult[fromUid]["12"] += 1;
        if (type == 12) {
            if (!obj.hasOwnProperty("11")) {
                obj["11"] = 0;
            }
            obj["11"] += 1;
        } else {
            obj[type] = (parseInt(obj[type])) + 1;
        }
    } else if (type == 17){
        //黄庄
        obj[type] = 0;
    } else{
        obj[type] = (parseInt(obj[type])) + 1;
    }
    obj["xing"] =  (parseInt(obj["xing"])) + xingNum;
    obj["ziShu"] = (parseInt(obj["ziShu"])) + ziNum*2;
    eachObj[uid] = ziNum*2;
    this.fightResult[uid] = obj;
    if(type == 12 || type == 15) {
        //点炮则双倍给点炮人
        obj = this.fightResult[fromUid];
        if (! obj.hasOwnProperty("ziShu")) {
            obj["ziShu"] = 0;
        }
        obj["ziShu"] = (parseInt(obj["ziShu"])) - ziNum*2;
        this.fightResult[fromUid] = obj;
        eachObj[fromUid] = -(ziNum*2);
    } else {
        for(i = 0;i < this.userList.length;i ++) {
            if(this.userList[i].uid != uid) {
                obj = this.fightResult[this.userList[i].uid];
                if (!obj.hasOwnProperty("ziShu")) {
                    obj["ziShu"] = 0;
                }
                obj["ziShu"] = (parseInt(obj["ziShu"])) - ziNum;
                this.fightResult[this.userList[i].uid] = obj;
                eachObj[this.userList[i].uid] = -(ziNum);
            }
        }
    }
    //插入玩家数据
    for(i = 0;i < this.userList.length;i ++) {
        this.userList[i].ziNum = this.fightResult[this.userList[i].uid]["ziShu"];
        this.userList[i].fightNum += 1;
    }
    this.eachFightResult.push(eachObj);
    this.sqlEach.push({
        time:Date.now(),
        userID:uid,
        type:this.getTypeStr(type,fromUid,uid),
        fx:xingNum,
        zs:ziNum
    });
    this.addEachPlayerData(type,fromUid,uid);
    if(this.currCircle >= this.juShu) {
        this.instertResultSql();
    }
}

//添加每场的玩家数据
Prototype.addEachPlayerData = function(type,fromUid,uid) {
    var huPlayer = this.getPlayer(uid);
    var dpPlayer = this.getPlayer(fromUid);
    switch(type) {
        case 14:
        case 16:
        case 13:
        case 11:
        case 15:
        case 12:
            huPlayer.winNum += 1;
            if(type == 12 || type == 15) {
                dpPlayer.dianPaoNum += 1;
            }
            else if(type == 13) {
                huPlayer.zimoNum += 1;
            }
            break;
    }
}

Prototype.getTypeStr = function(type,fromUid,uid) {
    var retunType = "";
    switch(type) {
        case 14:
            retunType = "th"
            break;
        case 16:
            retunType = "slwk"
            break;
        case 13:
            retunType = "zm"
            break;
        case 11:
            retunType = "ph"
            break;
        case 15:
        case 12:
            if(type == 15) {
                retunType = "dh"
            } else {
                retunType = "dp"
            }
            if(fromUid == this.playerCreator.uid) {
                retunType += "-user1";
            } else if(fromUid == this.playerCreator.rightPlayer) {
                retunType += "-user2";
            } else if(fromUid == this.playerCreator.leftPlayer) {
                retunType += "-user3";
            }
            break;
        case 17:
            retunType = "hz";
            break;
    }
    return retunType;
}


//将最终结果放进数据库中
Prototype.instertResultSql = function() {
    if(this.sqlEach.length == 0) {
        return;
    }
    if(!this.fightResult) {
        this.fightResult = {};
    }
    var creatorPlayer = this.playerCreator;
    var totalResult = {
        time: Date.now(),
        roomID: this.roomId,
        user1: creatorPlayer.uid,
        user2: creatorPlayer.rightPlayer,
        user3: creatorPlayer.leftPlayer,
    };

    var creatorPlayerResult = this.fightResult[creatorPlayer.uid];
    if(! creatorPlayerResult){
        creatorPlayerResult = {};
    }
    totalResult["user1Result"] = {
        uid : creatorPlayer.uid,
        name: creatorPlayer.name,
        head: creatorPlayer.head,
        thCount : creatorPlayerResult["14"] | 0,
        dhCount : creatorPlayerResult["15"] | 0,
        phCount : creatorPlayerResult["11"] | 0,
        zmCount : creatorPlayerResult["13"] | 0,
        dpCount : creatorPlayerResult["12"] | 0,
        slwkCount : creatorPlayerResult["16"] | 0,
        fxCount : creatorPlayerResult["xing"] | 0,
        zsCount : creatorPlayerResult["ziShu"] | 0
    };
    var creatorRPResult = this.fightResult[creatorPlayer.rightPlayer];
    if(! creatorRPResult){
        creatorRPResult = {};
    }
    var rightPlayer = this.getPlayer(creatorPlayer.rightPlayer);
    totalResult["user2Result"] = {
        uid : rightPlayer.uid,
        name: rightPlayer.name,
        head: rightPlayer.head,
        thCount : creatorRPResult["14"] | 0,
        dhCount : creatorRPResult["15"] | 0,
        phCount : creatorRPResult["11"] | 0,
        zmCount : creatorRPResult["13"] | 0,
        dpCount : creatorRPResult["12"] | 0,
        slwkCount : creatorRPResult["16"] | 0,
        fxCount : creatorRPResult["xing"] | 0,
        zsCount : creatorRPResult["ziShu"] | 0
    };
    var creatorLPResult = this.fightResult[creatorPlayer.leftPlayer];
    if(! creatorLPResult){
        creatorLPResult = {};
    }
    var leftPlayer = this.getPlayer(creatorPlayer.leftPlayer);
    totalResult["user3Result"] = {
        uid : leftPlayer.uid,
        name: leftPlayer.name,
        head: leftPlayer.head,
        thCount : creatorLPResult["14"] | 0,
        dhCount : creatorLPResult["15"] | 0,
        phCount : creatorLPResult["11"] | 0,
        zmCount : creatorLPResult["13"] | 0,
        dpCount : creatorLPResult["12"] | 0,
        slwkCount : creatorLPResult["16"] | 0,
        fxCount : creatorLPResult["xing"] | 0,
        zsCount : creatorLPResult["ziShu"] | 0
    };
    var param = {
        totalResult:totalResult,
        logs: this.sqlEach
    };

    resultDao.addResult(param,function(err,param) {

    });
    userDao.update({fightNum:creatorPlayer.fightNum,winNum:creatorPlayer.winNum,dianPaoNum:creatorPlayer.dianPaoNum,zimoNum:creatorPlayer.zimoNum},creatorPlayer.uid);
    userDao.update({fightNum:rightPlayer.fightNum,winNum:rightPlayer.winNum,dianPaoNum:rightPlayer.dianPaoNum,zimoNum:rightPlayer.zimoNum},rightPlayer.uid);
    userDao.update({fightNum:leftPlayer.fightNum,winNum:leftPlayer.winNum,dianPaoNum:leftPlayer.dianPaoNum,zimoNum:leftPlayer.zimoNum},leftPlayer.uid);
}

/*
 11代表普通胡牌，12代表点炮，13代表自摸,14代表天胡, 15代表地胡，16代表三龙五坎

 （3）胡数算子数：根据规则将胡数折算成子数，例如规则是10胡起胡，5胡一子，如果玩家胡牌时是21胡，那么子数就是3
 （4）翻醒算子数：1醒即为1子
 上醒：用翻出的牌在自己手中或已打出牌中找下一个数字，有几个算几醒
 中醒：用翻出的牌在自己手中或已打出牌中找同样数字，有几个算几醒
 下醒：用翻出的牌在自己手中或已打出牌中找上一个数字，有几个算几醒
 一次翻醒后如果上醒或者下醒有4个，那么可以继续再翻下一张

 天胡，地胡，三龙五坎，自摸翻倍，所有醒和胡数都翻倍
 （5）如果是翻牌胡的，那么两家都输对应的子数；
 如果是点炮胡，那么两家输的子数由点炮的玩家承担
 */
//插入每一场战局结果信息
//赢的玩家，赢的类型，赢的醒，赢的胡数，若有点炮就有fromUid
Prototype.calcZiNum = function(type,xing,huShu) {
    var ziNum = 1 + parseInt((huShu - this.minHu) / this.ziShu) + xing;
    if (type == 14 || type == 15 || type == 16) {
        //高级胡
        ziNum += ziNum;
    } else if (type == 13) {
        //自摸
        if (this.ziMo == 1 ) {
            ziNum += ziNum;
        } else if (this.ziMo == 2) {
            ziNum += 1;
        }
    }
    return ziNum;
}

//请求开始下一局。判断是否可以开始下一局 ，有一个人就表示开始了
Prototype.startNextFightOK = function(uid) {
    var index = this.requestNextList.indexOf(uid);
    if(index == -1) {
        this.requestNextList.push(uid)
    }
    if(this.requestNextList.length >= 1) {
        return true;
    }
    return false;
}

//开始新的一局清空前局的移留数据
Prototype.reset = function() {
    for(var i = 0;i < this.userList.length;i ++) {
        this.userList[i].resetData();
    }
    if(!! this.nowWinPlayer){
        this.lordPlayer = this.nowWinPlayer;//庄
    } else {
        this.lordPlayer = this.playerCreator;//庄
    }
    this.currPlayer = this.lordPlayer; //当前出牌玩家
    this.card = null; //该房间牌对象
    this.currMatchResult = null;//当前出牌后的匹配结果。。等客户端确定要操作请求过来后得处理uid = [{type:1,cardArr:[[]]}]
    this.cardStatus = "none" ;//none为无状态，post为此次为出牌响应，auto为些次为摸牌响应
    this.gameStatus = "inFree";//waitPost等待出牌，  waitAuto 等待出底牌,waitAct 等待玩家回应,waitFanXing 等待翻醒  over代表一局结束
    this.currCardId = 0 ;//当前房间的当前出牌的序号
    this.waitUidList = []; //需要等待回应的玩家的uid  倒计时时间到得自动清除
    this.prepareList=[];
    this.actRequestWait = {}; //玩家碰吃等操作的集合，因为有优先级,即为等待集合  uid = {type: 1,cardArr:[]}
    this.postNum = 0; //当前第几次出牌，用于判断地胡可以用
    this.oneFightResult = null;
    this.nowWinPlayer = null; //这次赢的玩家
    this.requestNextList = [];//申请开始下一局的玩家列表
    this.xingCard = [];
    this.actTime = Date.now();//房间的最后交互时间
    this.releasePlayer = null;
    this.clearRelaseList();
    this.clearCardEffect();
    this.clearChondZhaoDelay();
}

// 销毁房间
Prototype.destory = function(){
    this.clearReleaseTime();
    this.clearCardEffect();
    this.clearChondZhaoDelay();
}

//延迟1200ms 做服务器主动触发的 要牌效果
Prototype.startCardEffect = function(callback,params){
    this.clearCardEffect();
    this.cardEffectTimeID = setTimeout(callback,1000,this,params);
}

//取消卡牌效果延迟
Prototype.clearCardEffect = function(){
    if(!! this.cardEffectTimeID) {
        clearTimeout(this.cardEffectTimeID);
        this.cardEffectTimeID = null;
    }
}

//做重招请求下一个玩家摸牌的延迟
Prototype.startChongZhaoDelay = function(callback,params){
    this.clearChondZhaoDelay();
    this.chongZhaoTimeId = setTimeout(callback,4000,this,params);
}
//取消重招请求下一个玩家摸牌的延迟
Prototype.clearChondZhaoDelay = function(){
    if(!! this.chongZhaoTimeId) {
        clearTimeout(this.chongZhaoTimeId);
        this.chongZhaoTimeId = null;
    }
}


//下一局开始 的延迟 防止三家都切出后台,正常由客户端发起
Prototype.startNextFightDelay = function(callback,params){
    this.clearNextFightDelay();
    this.winNextTimeId = setTimeout(callback,25000,this,params);
}
//取消下一局开始 的延迟
Prototype.clearNextFightDelay = function(){
    if(!! this.winNextTimeId) {
        clearTimeout(this.winNextTimeId);
        this.winNextTimeId = null;
    }
}


//取消解散延时
Prototype.clearReleaseTime = function()
{
    if(!! this.timeOutReleaseId) {
        clearTimeout(this.timeOutReleaseId);
        this.timeOutReleaseId = null;
    }
}

//获取房间玩家简要信息回调给客户端
Prototype.getClientUserInfo = function(uid)
{
    var obj = {};
    for(var i = 0;i < this.userList.length;i ++) {
        obj[this.userList[i].uid] = this.userList[i].getClientInfo();
        if(this.userList[i].uid == uid){
            obj[uid]["handCardList"] = this.userList[i].handCardList;
        }
    }

    return obj;
}

//获取房间玩家简要信息回调给客户端
Prototype.getPlayer = function(uid)
{
    console.log("userList Data" + this.userList +" currselectUID"+uid);
    for(var i = 0;i < this.userList.length;i ++) {
        if(this.userList[i].uid == uid) {
            return this.userList[i];
        }
    }
    return null;
}

//房间添加一个玩家
Prototype.addPlayer = function(player) {
    this.userList.push(player);
    var pushIndex = -1;
    for (var i = 0; i < this.userOrderList.length; i++) {
        if (this.userOrderList[i] == null) {
            pushIndex = i;
            break;
        }
    }
    this.userOrderList[i] = player;
    this.setNeighbor();
}

//踢除某人出房间
Prototype.kickPlayer = function(uid) {
    var i = 0;
    for(i = 0;i < this.userList.length;i ++) {
        if (this.userList[i].uid == uid) {
            this.userList.splice(i,1);
            break;
        }
    }
    for(i = 0;i < this.userOrderList.length;i ++) {
        if (!! this.userOrderList[i] && this.userOrderList[i].uid == uid) {
            this.userOrderList[i] = null;
            break;
        }
    }
    var index = this.readyList.indexOf(uid);
    if(index != -1) {
        this.readyList.splice(index,1);
    }
    this.setNeighbor();
}


//某人请求解散 加入解散列表
Prototype.addReleaseRoom = function(uid) {
    var index = this.releaseRoomList.indexOf(uid);
    if(index == -1) {
        this.releaseRoomList.push(uid);
    }
}

//某人请求解散 加入解散列表
Prototype.clearRelaseList = function() {
    this.releaseRoomList = [];
    this.clearReleaseTime();
}

//过滤玩家等待列表
Prototype.filterWaitUIList = function() {
    parent: for (var i = 0; i < this.waitUidList.length; i++) {
        child: for(var j = 0;j < this.userList.length;j ++) {
            if(this.userList[j].uid == this.waitUidList[i] && (this.userList[j].isLost ||　this.userList[j].isOut)) {
                this.waitUidList.splice(i,1);
                i --;
                break child;
            }
        }
    }
}

//判断该房间是否有掉线玩家
Prototype.hasLost = function() {
    for(var j = 0;j < this.userList.length;j ++) {
        if(this.userList[j].isLost) {
            return true;
        }
    }
    return false;
}

//判断该房间玩家是否准备好
Prototype.isReady = function() {
    var isReady = true;
    for(var i = 0;i < this.userList.length;i ++) {
        if (this.userList[i].uid != this.playerCreator.uid && this.readyList.indexOf(this.userList[i].uid) == -1) {
            isReady = false;
        }
    }
    return isReady;
}

/*//判断该房间内是否有玩家掉线或者切出去不执行其他操作
Prototype.haveOutAndLost = function() {
    return false;
    var sendPlayer;
    var hasLost = false;
    for (var i = 0; i < this.userList.length; i++){
        sendPlayer = this.userList[i];
        if(sendPlayer.isLost || sendPlayer.isOut){
            hasLost = true;
            break;
        }
    }
    return hasLost;
}*/

//获取当前正常的玩家数量（指没有切出去及没有掉线）
Prototype.getActPlayerCount = function(){
    var actCount = 0;
    for(var i = 0;i < this.userList.length;i ++) {
        if(! this.userList[i].isLost && ! this.userList[i].isOut) {
            actCount ++;
        }
    }
    return actCount;
}