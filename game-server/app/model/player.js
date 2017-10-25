/**
 * Created by xieyq on 2017/3/21.
 */
var ArrayUtil = require("../util/arrayUtil");
var Rule = require("../model/rule");
var util = require("util");
var userDao = require("../dao/userDao");
var costDao = require("../dao/costDao");
var dayCostDao = require("../dao/dayCostDao");
module.exports = function (sid,param){
    return new Player(sid,param);
}

var Player = function (sid,param){
    this.name = param.nickname;   //玩家名字
    this.head = param.headimgurl; //头像代号
    this.sex = param.sex;//性别
    this.gold = param.gold;//金币
    this.fightCardCount = param.fightCardCount; //房卡
    this.loginTime = null;
    this.uid = String(param.userID);   //玩家唯一标识  名字+"_"+ROOMID
    this.fightNum = param.fightNum;//总玩的场次，算小一局的
    this.winNum = param.winNum ;//总赢的场次
    this.dianPaoNum = param.dianPaoNum ;//自己点炮的场次
    this.zimoNum =  param.zimoNum; //自己的自摸场次
    this.wechatID = param.wechatID;//微信号
    this.phoneNo = param.phoneNo; //手机号
    this.shareTimes = param.shareTimes; //分享次数
    this.shareStatus = param.shareStatus; //分享按钮状态 ： 分享 还是领取
    this.ipAddress = param.ipAddress;//玩家的ip地址
    this.token = param.token; //玩家的token
    this.openId = param.openId; //玩家的openId
    this.firstCharge = param.first_charge;//玩家首充的十进制记录 转二进制从右开始
    this.refreshToken = param.refreshToken;//玩家刷新授权的token
    this.codeInit = param.codeinit; //玩家类型1兑换码是否兑换
    this.createtimes = param.createtimes //玩家创建房间的次数
    this.isPublicWeb = param.isPublicWeb;//是否是公众平台登陆
    this.isLost = false; //是否掉线
    this.isOut = false; //是否切出后台
    this.sid = sid;   //前端服务器编号
    this.fightServerId = param.fightServerId; //fight服务器编号
    this.roomId = -1; //房间序号     从1开始
    this.uIndex = -1; //在房间中的排序    从1开始
    this.leftPlayer = null; //左边玩家 uid
    this.rightPlayer = null; //右边玩家 uid
    this.handCardList = []; //当前的手上的牌
    this.posCardList = []; //出掉的牌数
    this.outSideList = [];//牌放在自己桌面的牌， 和出掉的牌的区别是，出掉的牌可能会被其他人拿走去碰去扫等
    this.shaoList = [];//扫的列表
    this.pengList = []; //碰的列表
    this.rate = 0; //当前玩家获得的胡数
    this.isKaiZhao = false; //是否开招过
    this.ignorPengList =[]; //被忽略碰的数。用来判断过扫的
    this.ignorChiList = []; //能吃的牌被忽略，然后就都不能吃了
    this.currFightHuShu = 0 ;//当前这一局的胡数
    this.currEachHuList = [];//当前这一局 牌局的各列的胡数数组，供前端显示
    this.outSideKZHuId = 0; //开招胡的时候最后一张胡的牌
    this.outSideShaoHuId = 0;//扫穿胡的时候最后一张胡的牌
    this.needReconnectFight = false; //需要重连战斗
    this.ziNum = 0 ;//子数
    this.voiceId = 0;//语音房间ID
    this.locate = null;//玩家经纬度

}

//清除房间数据
Player.prototype.clearRoomData = function(){
    this.leftPlayer = null; //左边玩家 uid
    this.rightPlayer = null; //右边玩家 uid
    this.roomId = -1;
    this.ziNum = 0;//子数
    this.needReconnectFight = false; //需要重连战斗
    this.voiceId = 0;
    this.resetData();
}

//重置牌局数据
Player.prototype.resetData = function(){
    this.handCardList = []; //当前的手上的牌
    this.posCardList = []; //当前出掉的牌数
    this.outSideList = [];//牌放在自己桌面的牌， 和出掉的牌的区别是，出掉的牌可能会被其他人拿走去碰去扫等
    this.shaoList = [];//扫的列表
    this.pengList = []; //碰的列表
    this.rate = 0; //当前玩家获得的胡数
    this.isKaiZhao = false; //是否开招过
    this.ignorPengList =[]; //是否忽略过一次碰。用来判断过扫的
    this.ignorChiList = []; //能吃的牌被忽略，然后就都不能吃了
    this.currFightHuShu = 0 ;//当前这一局的胡数
    this.currEachHuList = [];//当前这一局 牌局的各列的胡数数组，供前端显示
    this.needReconnectFight = false; //需要重连战斗
    this.outSideKZHuId = 0; //开招胡的时候最后一张胡的牌
    this.outSideShaoHuId = 0;//扫穿胡的时候最后一张胡的牌
}

//处理碰后手上的牌数据  cardIdArr手上要被碰的牌，，currId别人出的或者摸的牌,xiahuo为下伙的牌，chongZhao为开招或重招后被动重招的牌
Player.prototype.handleActCard = function(type,cardIdArr,currId,xiahuo,next_xiahuo,chongZhao) {
    var cardArr;
    if (!! cardIdArr){
        cardArr = cardIdArr.slice(0);
        cardArr = cardArr.sort(ArrayUtil.sortNumber);
    }
    var obj;
    var i;
    switch (type) {
        case -1:
            //牌归自己的
            this.posCardList.push(currId);
            break;
        case 0:
            //自己出牌
            var cardIndex = this.handCardList.indexOf(currId);
            if(cardIndex != -1){
                this.handCardList.splice(cardIndex, 1);
            }
            this.ignorChiList.push(currId);
            break;
        case 1:
            //开招
            this.deleteHandCard(cardArr);
            cardArr.push(currId)
            this.outSideList.push({type: type, cardArr: cardArr,huShu:Rule.getRate(false,type,cardArr)});
            this.isKaiZhao = true;
            break;
        case 2:
            // 扫的开招
            this.deleteShaoCard(cardArr);
            for(i = 0;i < this.outSideList.length;i ++){
                obj = this.outSideList[i];
                if(obj.type == 8){
                    if(ArrayUtil.equalArr(cardArr,obj.cardArr)){
                        //将扫牌面上变开招
                        obj.type = 2;
                        cardArr.push(currId);
                        obj.cardArr = cardArr;
                        obj.huShu = Rule.getRate(false,type,cardArr);
                        break;
                    }
                }
            }
            this.isKaiZhao = true;
            break;
        case 3:
            //碰
            this.deleteHandCard(cardArr);
            cardArr.push(currId)
            this.pengList.push(cardArr);
            this.outSideList.push({type: type, cardArr: cardArr,huShu:Rule.getRate(false,type,cardArr)});
            break;
        case 4:
            //吃
            this.deleteHandCard(cardArr);
            cardArr.push(currId)
            this.outSideList.push({type:type,cardArr:cardArr,huShu:Rule.getRate(false,type,cardArr)});
            if (!! xiahuo){
                this.deleteHandCard(xiahuo);
                this.outSideList.push({type:type,cardArr:xiahuo,huShu:Rule.getRate(false,type,xiahuo)});
            }
            if (!! next_xiahuo){
                this.deleteHandCard(next_xiahuo);
                this.outSideList.push({type:type,cardArr:next_xiahuo,huShu:Rule.getRate(false,type,next_xiahuo)});
            }
            break;
        case 5:
            //手牌的重招
            this.deleteHandCard(cardArr);
            cardArr.push(currId);
            this.outSideList.push({type:type,cardArr:cardArr,huShu:Rule.getRate(false,type,cardArr)});
            break;
        case 6:
            //扫牌的重招
            this.deleteShaoCard(cardArr);
            for (i = 0;i < this.outSideList.length;i ++){
                obj = this.outSideList[i];
                if(obj.type == 8){
                    if(ArrayUtil.equalArr(cardArr,obj.cardArr)){
                        //将扫牌面上变开招
                        obj.type = 6;
                        cardArr.push(currId);
                        obj.cardArr = cardArr;
                        obj.huShu = Rule.getRate(false,type,cardArr);
                        break;
                    }
                }
            }
            break;
        case 7:
        case 8:
            //过扫
            //扫
            this.deleteHandCard(cardArr);
            cardArr.push(currId);
            this.shaoList.push(cardArr);
            this.outSideList.push({type:type,cardArr:cardArr,huShu:Rule.getRate(false,type,cardArr)});
            break;
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
            if(this.outSideKZHuId > 0){
                for(i = 0;i < this.outSideList.length;i ++){
                    obj = this.outSideList[i];
                    if(obj.type == 8 ||obj.type == 3){
                        if(obj.cardArr.indexOf(this.outSideKZHuId) != -1){
                            //将扫牌面上变开招
                            obj.type = 2;
                            obj.cardArr.push(currId);
                            obj.huShu = Rule.getRate(false,2,[currId,currId,currId,currId]);
                            break;
                        }
                    }
                }
            } else if (this.outSideShaoHuId > 0){
                //属于扫穿胡
                for (i = 0;i < this.outSideList.length;i ++){
                    obj = this.outSideList[i];
                    if (obj.type == 8 ){
                        if(obj.cardArr.indexOf(this.outSideShaoHuId) != -1){
                            //将扫牌面上变扫穿
                            obj.type = 9;
                            obj.cardArr.push(currId);
                            obj.huShu = Rule.getRate(false,9,[currId,currId,currId,currId]);
                            break;
                        }
                    }
                }
            } else {
                //胡了，将最终的胡牌放入手牌算翻醒
                this.handCardList.push(currId);
            }
            break;
        case 9:
        case 91:
            //扫穿
            this.deleteHandCard(cardArr);
            cardArr.push(currId)
            console.log("扫穿结果" + cardArr+ + " length" + cardArr.length);
            this.outSideList.push({type:type,cardArr:cardArr,huShu:Rule.getRate(false,type,cardArr)});
            this.isKaiZhao = true;
            break;
        case 10:
        case 101:
            //扫牌面上的 扫穿
            this.deleteShaoCard(cardArr);
            for(i = 0;i < this.outSideList.length;i ++){
                obj = this.outSideList[i];
                if(obj.type == 8){
                    if(ArrayUtil.equalArr(cardArr,obj.cardArr)){
                        //将扫牌面上变扫穿牌
                        obj.type = 10;
                        cardArr.push(currId);
                        obj.cardArr = cardArr;
                        obj.huShu = Rule.getRate(false,type,cardArr);
                        break;
                    }
                }
            }
            this.isKaiZhao = true;
            break;
        case 31:
        case 32:
            //碰的开招和重招
            this.isKaiZhao = true;
            child: for (i = 0;i < this.pengList.length;i ++){
                if (ArrayUtil.equalArr(cardArr,this.pengList[i])){
                    this.pengList.splice(i,1);
                    break child;
                }
            }
            sChild:  for(i = 0;i < this.outSideList.length;i ++){
                obj = this.outSideList[i];
                if(obj.type == 3){
                    if(ArrayUtil.equalArr(cardArr,obj.cardArr)){
                        //将碰牌面上变开招牌
                        obj.type = 1;
                        cardArr.push(currId);
                        obj.cardArr = cardArr;
                        obj.huShu = Rule.getRate(false,type,cardArr);
                        break sChild;
                    }
                }
            }
            break;
    }
    if(!!chongZhao){
        var childArr;
        var cardIndex;
        for(i = 0;i < chongZhao.length;i ++) {
            childArr = chongZhao[i];
            for(var j = 0;j < childArr.length;j ++) {
                cardIndex = this.handCardList.indexOf(parseInt(childArr[j]));
                if(cardIndex != -1){
                    this.handCardList.splice(cardIndex,1);
                }
            }
            this.outSideList.push({type:type,cardArr:childArr,huShu:Rule.getRate(false,0,null,null,null,[childArr])});
        }
    }
}


// 计算玩家的胡数
/* 小三张对：打出为1胡；拿在手上，扫的为3胡
 大三张对：打出为3胡；拿在手上，扫的为6胡
 小三连续：只有特殊牌型：一二三，二七十，才算胡数，打出或手上都是3胡
 大三连续：只有特殊牌型：壹贰叄，贰柒拾，才算胡数，打出或手上都是6胡
 小四张：打出为6胡；拿在手上，扫的为9胡
 大四张：打出为9胡；拿在手上，扫的为12胡*/
//指令中有关棋牌中的type值均为1为开招，2为扫的开招，3为碰，4为吃xiahuo代表xiaohuo的牌，5为手牌的重招，6为扫的重招,7代表过扫，8代表扫,9代表扫穿，
Player.prototype.setRate = function(currCardId,type,cardIdArr,xiahuo,next_xiahuo,chongZhao) {
    var nowIdArr = cardIdArr.slice(0);
    nowIdArr.push(currCardId);
    this.rate +=  Rule.getRate(true,type,nowIdArr,xiahuo,next_xiahuo,chongZhao);
}


//列表,几个为一起，小子分数，大子分数
Player.prototype.calcHuShu = function(cardIdArr,sScore,bScore) {
    if(parseInt(cardIdArr[0]) > 10) {
        return bScore;
    }
    return sScore;
}

//清除手牌中对应的几个牌
Player.prototype.deleteHandCard = function(cardIdArr) {
    var cardIndex;
    for(var i = 0;i < cardIdArr.length;i ++) {
        cardIndex = this.handCardList.indexOf(cardIdArr[i]);
        if (cardIndex !=-1 ) {
            this.handCardList.splice(cardIndex,1);
        }
    }
}


//清除扫牌中对应的几个牌，因为被开招拿去了
Player.prototype.deleteShaoCard = function(cardIdArr) {
    for(var i = 0;i < this.shaoList.length;i ++) {
        if (ArrayUtil.equalArr(this.shaoList[i],cardIdArr))
        {
            this.shaoList.splice(i,1);
            break;
        }
    }
}

//判断是否有忽略碰
Player.prototype.isIgnorPeng = function(cardId) {
    return this.ignorPengList.indexOf(cardId) != -1;
}

//判断手上是否有四张重招的牌
Player.prototype.handChongZhao = function() {
    var repeatObj = {};
    var cardId;
    var returnArr = null ;
    for (i = 0; i < this.handCardList.length; i++) {
        cardId = this.handCardList[i];
        if(!repeatObj.hasOwnProperty(cardId)) {
            repeatObj[cardId] = 0;
        }
        repeatObj[cardId] ++;
    }
    for(var prop in repeatObj) {
        if(repeatObj[prop] == 4) {
            if (! returnArr) {
                returnArr =[];
            }
            cardId = parseInt(prop);
            returnArr.push([cardId,cardId,cardId,cardId]);
        }
    }
    return returnArr;
}


//获取玩家身上和牌面上所有的牌
Player.prototype.getAllCard = function() {
    var obj;
    var outCardList = [];
    for(var i = 0;i < this.outSideList.length;i ++) {
        obj = this.outSideList[i];
        outCardList = outCardList.concat(obj.cardArr);
    }
    return this.handCardList.concat(outCardList);
}


//此牌玩家是否忽略过
//true则代表忽略过
Player.prototype.checkCardIgnore = function(type,cardId) {
    if (type == 3) {
        //碰
        return this.ignorPengList.indexOf(cardId) != -1;
    }
    else if (type == 4)
    {
        return this.ignorChiList.indexOf(cardId) != -1;
    }
}

//获取玩家牌面上的数据
Player.prototype.getOutSideList = function() {
    var arr = [];
    var huShuArr = [];
    for(var i = 0;i < this.outSideList.length;i ++) {
        arr.push(this.outSideList[i].cardArr);
        huShuArr.push(this.outSideList[i].huShu);
    }
    return {cardArr:arr,huShu:huShuArr};
}

//开房后扣除玩家房卡
Player.prototype.useRoomCard = function(jushu) {
    var use = Math.ceil(jushu/10);
    if(this.fightCardCount >= use) {
        this.fightCardCount -= use;
        this.createtimes ++;
        userDao.update({fightCardCount:this.fightCardCount,createtimes:this.createtimes},this.uid);
        costDao.insertCostCard(this.uid,use);
        dayCostDao.insertDayCost(this.uid,use);
        return true;
    } else {
        return false;
    }
}

//开房后扣除玩家房卡
Player.prototype.roomCardEnough = function(jushu) {
    var use = Math.ceil(jushu/10);
    return this.fightCardCount >= use;
}

//获取玩家需要发送给客记端的字段
Player.prototype.getClientInfo = function() {
    var obj = {
        name: this.name,  //玩家名字
        head: this.head, //头像代号
        sex: this.sex,//性别
        gold: this.gold,//金币
        uid: this.uid,  //玩家唯一标识  名字+"_"+ROOMID
        roomId: this.roomId,  //房间序号     从1开始
        leftPlayer: this.leftPlayer,  //左边玩家 uid
        rightPlayer: this.rightPlayer,  //右边玩家 uid
        posCardList: this.posCardList, //出掉的牌数
        outSideList: this.outSideList,//牌放在自己桌面的牌， 和出掉的牌的区别是，出掉的牌可能会被其他人拿走去碰去扫等
        rate:this.rate,//当前玩家获得的胡数
        isLost:this.isLost,
        isOut: this.isOut,
        ziNum:this.ziNum, //玩家子数
        roomCard:this.fightCardCount, //房卡
        fightNum:this.fightNum,//总玩的场次，算小一局的
        winNum: this.winNum ,//总赢的场次
        dianPaoNum: this.dianPaoNum,//自己点炮的场次
        zimoNum:this.zimoNum, //自己的自摸场次
        wechatID:this.wechatID,//微信号
        phoneNo:this.phoneNo,//手机号
        ipAddress: this.ipAddress, //玩家IP地址,
        voiceId:this.voiceId,
        firstCharge:this.firstCharge, //首充的情况
        locate:this.locate //玩家经纬度
    }
    return obj;
}

