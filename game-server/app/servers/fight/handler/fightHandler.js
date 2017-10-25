/**
 * Created by xieyq on 2017/3/24.
 */

var GameConst = require("../../../util/gameConstant");
var Rule = require("../../../model/rule");
var ArrayUtil = require("../../../util/arrayUtil");
var ClientNet = require('../../../model/clientNet');
var fightDetailLogger = require('pomelo-logger').getLogger('fightDetail', __filename, process.pid);
var util = require("util");
var Code = require("../../../util/code");
module.exports = function (app) {
    return new Handler(app);
}

var Handler = function(app) {
    this.app = app;
    this.channelService =  this.app.get('channelService');
}

var handler = Handler.prototype;

//游戏开始，获取棋牌信息
handler.getCardInfo = function (msg, session, next) {
    var roomId = session.get("roomId");
    if(! roomId) {
        next(null, {
                code: Code.FIGHT.NO_ROOM_ID
            });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    } else {
        for(var i = 0;i < channel.room.userList.length;i ++) {
            if(channel.room.userList[i].uid == session.uid) {
                next(null, {
                    code: Code.OK,
                    user:  channel.room.userList[i]
                });
                return;
            }
        }
    }
}

//请求档底，出庄家
handler.getLordPlayer = function(channel)
{
    var gameRoom = channel.room;
    if(gameRoom.gameStatus != "waitLorder") {
        return ;
    }
    var nextId = gameRoom.getNextCard();
    gameRoom.lordPlayer.handCardList.push(nextId);
    gameRoom.gameStatus = "waitPost";
    channel.pushMessage({
        route: 'onLordSelect',
        uid: gameRoom.lordPlayer.uid,
        id:nextId,
        remainNum: gameRoom.card.remainCard.length
    });

    //检测庄家是否天胡
    var canHuList = Rule.calcHu(gameRoom.minHu,gameRoom.lordPlayer,nextId,gameRoom.lordPlayer.uid,true,true);
    ClientNet.noteCurrPlayer(channel,gameRoom.currPlayer.uid,gameRoom.gameStatus);
    var sendClient = {};
    if(!! canHuList) {
        //天胡
        gameRoom.gameStatus = "waitAct";
        if(!sendClient[gameRoom.currPlayer.uid]) {
            sendClient[gameRoom.currPlayer.uid] = [];
        }
        sendClient[gameRoom.currPlayer.uid].push({type:14,cardArr:canHuList,from: gameRoom.currPlayer.uid,id:nextId});
        gameRoom.currMatchResult = sendClient;
        this.sendHuMsg(channel,gameRoom.currPlayer.uid,{type:14});
    } else {
        //检测是否有玩家是三龙五坎
        canHuList = Rule.calcUserSLWK(gameRoom.userList,gameRoom.currPlayer);
        if(!! canHuList) {
            var player = canHuList.player;
            var huList = canHuList.list;
            gameRoom.gameStatus = "waitAct";
            if(!sendClient[player.uid]) {
                sendClient[player.uid] = [];
            }
            sendClient[player.uid].push({type:16,cardArr:huList,from: player.uid,id:nextId});
            gameRoom.currMatchResult = sendClient;
            this.sendHuMsg(channel,player.uid,{type:16});
        }
    }
    fightDetailLogger.info("roomId:" + gameRoom.roomId +" currCircle:" + gameRoom.currCircle  + " afterLorderRemainCard:"+ gameRoom.card.remainCard);
    for(var i = 0;i < gameRoom.userList.length;i ++){
        fightDetailLogger.info("roomId:" + gameRoom.roomId +" currCircle:" + gameRoom.currCircle + " playerName:" + gameRoom.userList[i].name + " afterLorderHandList:"+ gameRoom.userList[i].handCardList);
    }
}

//玩家请求出牌
//{出排的序号id:XX}
handler.postCard = function (msg, session, next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
                code: Code.FIGHT.NO_ROOM_ID
            })
        return;
    }
    var cardId =  parseInt(msg.id);
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    if (! channel || !( channel.room.gameStatus == "waitPost")) {
        next(null, {
                code:Code.FIGHT.NOT_WAIT_POST
            });
        return;
    }
    var gameRoom = channel.room;
    gameRoom.actTime = Date.now();
    var player = channel.userMap[session.uid];
    if(player.uid != gameRoom.currPlayer.uid)
   {
        next(null, {
            code: Code.FIGHT.NOT_YOU_CURRENT,
            msg: 'note you current'
        });
        return;
    }
    var cardIndex = player.handCardList.indexOf(cardId);
    if(cardIndex == -1)
   {
        next(null, {
            code:Code.FIGHT.NOT_HAVE_CARD_ID,
            msg: 'not have cardId' + cardId
        });
        return;
    }
    gameRoom.cardIngnorNum = 0;
    gameRoom.cardStatus = "post";
    gameRoom.currCardId = cardId;
    gameRoom.currPlayer = player;
    gameRoom.postNum ++;
    player.handleActCard(0,null,cardId);
    channel.pushMessage({
        route: 'onPostCard',
        uid:player.uid,
        id: cardId
    });
    //出牌后判断各玩家的出牌结果
    gameRoom.currMatchResult =  Rule.checkPostCard(gameRoom.currPlayer,gameRoom.currCardId,gameRoom.userList,gameRoom.minHu,false);
    next(null,{
        code:Code.OK
    });
    fightDetailLogger.info("roomId:" + gameRoom.roomId +" currCircle:" + gameRoom.currCircle + " playerName:" + player.name + " postID:" + cardId + " afterPostHandList:"+ player.handCardList);
    if(!!gameRoom.currMatchResult) {
        var huUid;
        if(gameRoom.postNum == 1) {
            huUid = Rule.resultHasHu(gameRoom.currMatchResult);
            if(!! huUid) {
                //地胡
                this.sendHuMsg(channel, huUid, {type: 15});
            }
        }
        if(! huUid){
            channel.room.gameStatus = "waitAct";
            this.responseCardPost(channel, channel.room.currMatchResult);
        }
    } else {
        gameRoom.setAllWait();
        gameRoom.gameStatus = "waitAuto";
        player.handleActCard(-1,null,cardId);
        //代表没人要，出牌成功，接下来客户端会请求下一轮
        channel.pushMessage({
                route: 'onNoneAct',
                id: cardId
        });
    }
}

//当这张牌有人需要的时候回应客户端出牌结果
handler.responseCardPost = function (channel,matchResult) {
    channel.room.waitUidList= [];
    var actObj;
    var tempUid;
    for(tempUid in matchResult) {
        actObj = matchResult[tempUid];
        for(var i = 0 ;i< actObj.length;i ++){
            if(channel.room.isAutoAct(actObj[i].type)){
                actObj[i]["response"] = "onAutoAct";
                var self = this;
                actObj[i]["cardArr"] =  actObj[i]["cardArr"][0];
                channel.room.startCardEffect(function(room,params){
                    // this.sendActMsg(channel,tempUid,actObj[i]);
                     self.sendActMsg(params.channel,params.uid,params.data);
                     room.clearCardEffect();
                },{uid:tempUid,data:actObj[i],channel:channel});
                return;
            }
        }
    }

    for(tempUid in matchResult) {
        actObj = matchResult[tempUid];
        channel.room.waitUidList.push(tempUid);
        this.channelService.pushMessageByUids('onCardCallBack',actObj, [{
            uid: tempUid,
            sid: channel.userMap[tempUid].sid
        }]);
    }
}

//客户端请求 可响应牌的忽略
handler.cardActPass = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var gameRoom = channel.room;
    gameRoom.actTime = Date.now();
    var gameStatus = gameRoom.gameStatus;
    var player = channel.userMap[session.uid];
    if(gameStatus == "waitAct" ) {
        var idIndex = gameRoom.waitUidList.indexOf(session.uid);
        if (idIndex != -1) {
            gameRoom.waitUidList.splice(idIndex, 1);
        } else {
            next(null,
                {
                    code:Code.FIGHT.NOT_IN_ACT_WAIT_LIST,
                    msg: "you are not in waitlist"
                });
            return;
        }
        var done =false;
        if(!! gameRoom.currMatchResult) {
            gameRoom.handlerActPass(player);
            if (gameRoom.haveActWait()) {
                //判断是否有等待指令需要执行
                delete gameRoom.currMatchResult[session.uid];
                var doneActResult = gameRoom.doneActWait();
                if (!! doneActResult) {
                    done = true;
                    this.sendActMsg(channel,doneActResult.uid,doneActResult.msg);
                    next(null, {code: Code.OK});
                }
            } else {
                delete gameRoom.currMatchResult[session.uid];
            }
        }

        if(! done) {
            if (gameRoom.waitUidList.length == 0) {
                channel.pushMessage({
                    route: 'onNoneAct',
                    id: gameRoom.currCardId
                });
                gameRoom.currPlayer.handleActCard(-1, null, gameRoom.currCardId);
                gameRoom.gameStatus = "waitAuto";
                gameRoom.setAllWait();
                next(null, {code: Code.OK});
            } else {
                next(null, {code: Code.FIGHT.ACT_PASS_WAIT_OTHER,msg:"pass card wait other"});
            }
        }
    } else {
        next(null,{code:Code.FIGHT.NOT_IN_WAIT_ACT_STATUS});
    }
}
//客户端请求下一步。。当牌都飞完后
//{｝
handler.cardPass = function(msg, session, next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        })
        return;
    }

    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var gameRoom = channel.room;
    var gameStatus = gameRoom.gameStatus;
    if(gameStatus == "waitAuto") {
        var idIndex = gameRoom.waitUidList.indexOf(session.uid);
        if (idIndex != -1) {
            gameRoom.waitUidList.splice(idIndex, 1);
            //====================================只收到一个人的信息就行,时间限制1200ms
            var nowDateValue = Date.now();
            if(nowDateValue - gameRoom.cardPassTime < 1200){
                next(null,{code:Code.FIGHT.CARD_PASS_TIME_LIMIT,msg: "card pass time limit"});
                return;
            }
            gameRoom.cardPassTime = nowDateValue;
            gameRoom.waitUidList.length  = 0;
            //====================================
        } else {
            next(null,{code:Code.FIGHT.NOT_IN_CARD_PASS_WAIT_LIST,msg: "you are not in waitlist"});
            return;
        }
        gameRoom.filterWaitUIList();
        if (gameRoom.waitUidList.length == 0) {
            this.toAutoCard(session);
            if(!! next){
                 next(null, {code: Code.OK});
            }
        } else {
            if(!! next){
                next(null, {code: Code.FIGHT.PASS_CARD_WAIT_OTHER});
            }
        }
    } else {
        if(!! next) {
            next(null, {code: Code.FIGHT.NOT_IN_WAIT_AUTO_STATUS});
        }
    }
}

//所有玩家飞玩牌，请求自动下一个翻牌
handler.toAutoCard = function(session,roomIdValue) {
    var roomId = 0;
    if(!! roomIdValue){
        roomId = roomIdValue;
    } else{
        roomId = session.get('roomId');
    }
    var channel = this.channelService.getChannel(roomId, false);
    var gameRoom = channel.room;
    gameRoom.actTime = Date.now();
    var nextCardId = gameRoom.getNextCard();
    if (nextCardId != -1) {
        gameRoom.cardStatus = "auto";
        gameRoom.currPlayer = channel.room.getNextPlayer();
        gameRoom.currCardId = nextCardId;
        var player = gameRoom.currPlayer;
        gameRoom.gameStatus = "waitCalc";
        fightDetailLogger.info("roomId:" + gameRoom.roomId +" currCircle:" + gameRoom.currCircle + " remainCardList:"+ gameRoom.card.remainCard);
        ClientNet.noteCurrPlayer(channel, player.uid,gameRoom.gameStatus);
        //摸牌后判断各玩家的出牌结果
        gameRoom.currMatchResult =  Rule.checkAutoCard(player,gameRoom.currCardId,gameRoom.userList,gameRoom.minHu);
        if(!!gameRoom.currMatchResult) {
            this.noteCurrAutoCard(channel,player.uid, nextCardId,gameRoom.card.remainCard.length,Rule.getCardVisible(gameRoom.currMatchResult));
            gameRoom.gameStatus = "waitAct";
            this.responseCardPost(channel,gameRoom.currMatchResult);
        } else {
            this.noteCurrAutoCard(channel, player.uid, nextCardId,gameRoom.card.remainCard.length,1);
            gameRoom.setAllWait();
            gameRoom.gameStatus = "waitAuto"
            //代表没人要，出牌成功，接下来客户端会请求下一轮
            channel.pushMessage({
                route: 'onNoneAct',
                id: gameRoom.currCardId
            });
            player.handleActCard(-1,null,gameRoom.currCardId);
        }
    } else {
        gameRoom.gameStatus = "waitResult";
        //通知黄牌
        channel.pushMessage({
            route: 'onEndGame'
        });
        gameRoom.setFightResult(gameRoom.currPlayer.uid,17,0,0,null);
        this.requestEachResult(roomId);
    }
}

//通知下一张底牌
handler.noteCurrAutoCard = function(channel,uid,cardId,remainNum,cardVisible)
{
    //当前发送
    channel.pushMessage({
        route: 'onCurrAutoCard',
        uid:uid,
        id:cardId,
        visible: parseInt(cardVisible),
        remainNum:remainNum
    });
}


//==========================================================================================字牌各种规则判断
//客户端请求对可以响应的牌进行确定处理
//type,cardArr
handler.cardActRequest = function(msg,session,next)
{
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }

    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    channel.room.actTime = Date.now();
    var player = channel.userMap[session.uid];
    if(channel.room.gameStatus != "waitAct") {
        next(null,{
            code:Code.FIGHT.NOT_IN_WAIT_ACT_STATUS,
            msg:"no status"
        });
        return;
    }
    var currMathResult = channel.room.currMatchResult;
    if(!  currMathResult|| ! currMathResult[session.uid]) {
        next(null,{
            code: Code.FIGHT.NO_MATCH_ACT_RESULT,
            msg: "no result"
        });
        return;
    }
    if(channel.room.checkMsgOk(msg,session.uid)) {
        var requestActResult =  channel.room.handleActRequest(msg,session.uid);
        if (!! requestActResult) {
            if(Rule.isHuType(msg.type)) {
                //广播胡
                this.sendHuMsg(channel, player.uid, msg);
            } else {
                this.sendActMsg(channel, player.uid, msg);
            }
            next(null, {
                code: Code.OK
            });
            return;
        } else {
            var delPeng = channel.room.deletePengMatch(msg.type,player);
            if(delPeng) {
                var doneActResult = channel.room.doneActWait();
                if (!! doneActResult) {
                    this.sendActMsg(channel,doneActResult.uid,doneActResult.msg);
                    next(null, {code: Code.OK});
                }
            } else {
                next(null, {
                    code:Code.FIGHT.CARD_ACT_WAIT_OTHER,
                    msg:'wait other'
                });
            }
            return;
        }
    }
    next(null, {
        code:Code.FIGHT.CARD_ACT_NO_CONDITION,
        msg:'no condition'
    });
}
//接收客户端act的指令后下发结果
handler.sendActMsg = function(channel,uid,msg) {
    if(!! channel.room.currMatchResult) {
        delete channel.room.currMatchResult[uid];
    }
    var player = channel.userMap[uid];
    var cardIdArr = msg.cardArr;
    var param = {
        route: msg.response,
        uid: player.uid,
        cardArr: cardIdArr,
        type: msg.type
    };

    if (!!msg.xiahuo && msg.xiahuo.length > 0) {
        param["xiahuo"] = msg.xiahuo;
    }
    if (!!msg.next_xiahuo && msg.next_xiahuo.length > 0) {
        param["next_xiahuo"] = msg.next_xiahuo;
    }

    var isChongZhao = Rule.isChongZhao(parseInt(msg.type));
    if (Rule.isKaiZhao(parseInt(msg.type)) || isChongZhao) {
        //开招
        var handZhaoArr = player.handChongZhao();
        if (!!handZhaoArr) {
            param["chongZhao"] = handZhaoArr;
            isChongZhao = true;
        }
        if (isChongZhao) {
            //有重招的话
            //channel.room.gameStatus = "waitRequestNext";
        }
    }
    player.handleActCard(msg.type, cardIdArr, channel.room.currCardId, msg.xiahuo, msg.next_xiahuo,param["chongZhao"]);
    channel.room.currPlayer = player;
    if(! isChongZhao) {
        channel.room.gameStatus = "waitPost";
    }
    channel.room.actRequestWait = {};
    player.setRate(channel.room.currCardId, msg.type, cardIdArr, msg.xiahuo, msg.next_xiahuo, param["chongZhao"]);
    channel.pushMessage(param);
    ClientNet.updateFightUserInfo({ uid: player.uid,rate: player.rate},channel);
    fightDetailLogger.info("roomId:" + channel.room.roomId +" currCircle:" + channel.room.currCircle + " playerName:" + player.name + " actType:" + msg.type + " actCard:" + cardIdArr + " afterActHandList:"+ player.handCardList);
    if (!isChongZhao) {
        ClientNet.noteCurrPlayer(channel, channel.room.currPlayer.uid,channel.room.gameStatus);
    } else {
        var self = this;
        channel.room.startChongZhaoDelay(function(room,params){
            room.clearChondZhaoDelay();
            self.toAutoCard(null,room.roomId);
        },{})
    }
}


//客户端请求直接进入下一个玩家
handler.requestNextPlayer = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }

    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var player = channel.userMap[session.uid];
    if(!channel.room || channel.room.gameStatus != "waitRequestNext") {
        next(null, {
                code:Code.FIGHT.NOT_IN_WAIT_REQUEST_NEXT_PLAYER,
                msg: "no condition"
       });
    }
    this.toAutoCard(session);
    next(null,{
        code:Code.OK,
        msg:"success"
    });
}

//发送给客户端某人胡了的指令
handler.sendHuMsg = function(channel,uid,msg) {
    var player = channel.userMap[uid];
    channel.room.currPlayer = player;
    var huObj = channel.room.currMatchResult[player.uid][0];
    if(!! channel.room.currMatchResult) {
        delete channel.room.currMatchResult[uid];
    }
    channel.room.gameStatus = "waitFanXing";
    channel.room.nowWinPlayer = player;
    channel.room.winerList.push(player.uid);
    player.handleActCard(msg.type, null, channel.room.currCardId);
    console.log("当前最终胡的牌" + huObj.cardArr);
    for(var i = 0;i < huObj.cardArr.length;i ++) {
        console.log("子集"+ huObj.cardArr[i]);
    }
    channel.room.setOneFightResult(player,msg.type,huObj.from,huObj.cardArr,huObj.id);
    channel.room.actRequestWait ={};
    var outSideCard = player.outSideKZHuId > 0 ? player.outSideKZHuId : player.outSideShaoHuId;
    var param = {
        route: "onWin",
        uid: player.uid,
        type: msg.type,
        id:huObj.id,
        cardArr: huObj.cardArr,
        from:huObj.from,
        outSide:outSideCard
    };
    var userList = channel.room.userList;
    for(var i = 0; i < userList.length; i ++){
        param[userList[i].uid] = userList[i].handCardList;
    }
    channel.pushMessage(param);
    this.requestFanXing(channel.room.roomId);
}

//胡牌方客户端请求翻醒
handler.requestFanXing = function(roomId) {
    if(! roomId) {
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    var player = channel.room.nowWinPlayer;
    var gameRoom = channel.room;
    console.log("fanXingBefore gameStatus" + gameRoom.gameStatus);
    if (gameRoom.gameStatus != "waitFanXing") {
        return;
    }
    var param = this.getFanXingDate(gameRoom,player,{});
    console.log("fanxing value " + util.inspect(param));
    param["route"] = "onFanXing";
    param["uid"] = player.uid;
    gameRoom.gameStatus = "waitResult";
    param["remainCard"] = gameRoom.card.remainCard;
    channel.pushMessage(param);
    gameRoom.addOneXingResult(param["xing"]);
    this.requestEachResult(roomId);
}

//获取翻醒数据
handler.getFanXingDate = function (room,player,param) {
    var nextId = room.getNextCard();
    var xingObj = {needNext: 0, xing: 0};
    room.xingCard.push(nextId);
    if (nextId != -1) {
        xingObj = Rule.calcXing(nextId, player.getAllCard(), room.fanXing);
    }
    if(! param.hasOwnProperty("id")) {
        param["id"] = [];
    }
    param["id"].push(nextId);
    if(! param.hasOwnProperty("xing")) {
        param["xing"] = [];
    }
    param["xing"].push(xingObj.xing);
    if(xingObj.needNext == 1) {
        this.getFanXingDate(room,player,param);
    }
    return param;
}
//胡牌方客户端请求结算
handler.requestEachResult = function(roomId) {
    if (!roomId) {
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);

    var gameRoom = channel.room;
    if (gameRoom.gameStatus != "waitResult") {
        return;
    }
    var resultObj = gameRoom.oneFightResult;
    var param;
    var remainCard = gameRoom.card.remainCard.slice(0);
    if (!! resultObj) {
        remainCard = remainCard.concat(gameRoom.xingCard);
        for (var uid in resultObj) {
            var player = channel.userMap[uid];
            var outSideData = player.getOutSideList();
            resultObj[uid]["cardArr"] = outSideData.cardArr.concat(resultObj[uid]["cardArr"]);
            resultObj[uid]["eachHu"] = outSideData.huShu.concat(resultObj[uid]["eachHu"]);
            param = {
                route: "onEachResult",
                uid: uid,
                type: resultObj[uid]["type"],
                cardArr: resultObj[uid]["cardArr"],
                huShu: resultObj[uid]["huShu"],
                ziNum: resultObj[uid]["ziNum"],
                fromUid: resultObj[uid]["fromUid"],
                xing: resultObj[uid]["xing"],
                id: resultObj[uid]["id"],
                eachHu: resultObj[uid]["eachHu"],
                remainCard: remainCard
            }
        }
    } else {
        param = {
            route: "onEachResult",
            remainCard: remainCard
        }
    }
    channel.pushMessage(param);
    if(gameRoom.currCircle >= gameRoom.juShu) {
        gameRoom.gameStatus = "waitEnd";
    } else {
        gameRoom.gameStatus = "waitNext";
        gameRoom.winTime = Date.now();
        var self = this;
        gameRoom.startNextFightDelay(function(room,params){
                room.clearNextFightDelay();
                ClientNet.nextFightHandler(params.channel.userMap[params.uid],self.channelService,room,params.channel);
        }
        ,{channel:channel,uid:gameRoom.userList[0].uid});
    }
}

//客户端再来一局  即请求 下一局的开始
handler.requestNextFight = function(msg,session,next) {
    var roomId = session.get('roomId');

    if(! roomId) {
        if(!! next){
            next(null, {
                code: Code.FIGHT.NO_ROOM_ID
            });
        }
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        if(!! next){
            next(null, {
                code: Code.FIGHT.NO_CHANNEL
            });
        }
        return;
    }
    var gameRoom = channel.room;
  if((Date.now() - gameRoom.winTime) < 7000){
      if(!! next){
          next(null, {
              code: Code.FAIL,
              msg: "not in TIME"
          });
      }
      return;
  }
    if (gameRoom.gameStatus != "waitNext") {
        if(!! next){
            next(null, {
                code: Code.FIGHT.NOT_IN_WAIT_NEXT_FIGHT,
                msg: "not in waitNext"
            });
        }
        return;
    }
    if(gameRoom.currCircle >= gameRoom.juShu) {
        if(!! next){
            next({
                code: Code.FIGHT.FIGHT_CIRCLE_FULL,
                msg:"circle is full"
            });
        }
        return;
    }
    gameRoom.clearNextFightDelay();
    ClientNet.nextFightHandler(channel.userMap[session.uid],this.channelService,gameRoom,channel);
    if(!! next){
        next(null, {
            code:Code.OK
        });
    }
}


//房主踢掉某个玩家离开房间
//@uid
handler.kickPlayer = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var gameRoom = channel.room;
    if(gameRoom.status == "fight") {
        next(null, {
            code: Code.FIGHT.IN_FIGHTING_DONOT_KICK,
            msg: "is in fighting"
        });
        return;
    }
    if(session.uid != gameRoom.playerCreator.uid)
    {
        next(null,{
            code: Code.FIGHT.NOT_CREATOR,
            msg: "not you creator"
        });
        return;
    }
    this.channelService.pushMessageByUids('onKicked',{}, [{
        uid: msg.uid,
        sid: channel.userMap[msg.uid].sid
    }]);
    gameRoom.kickPlayer(msg.uid);
    gameRoom.status = "waiting";
    var player = channel.userMap[msg.uid];
    self = this;
    self.app.rpc.chat.chatRemote.delPlayer(session,player.uid,player.sid,roomId,function(){

    });
    ClientNet.enterMainRoom(player, this.channelService);
    delete channel.userMap[msg.uid];
    channel.leave(player.uid, player.sid);
    ClientNet.pushUpdateUserList(channel);
    next(null,{
        code: Code.OK
    });
}

//玩家请求准备
handler.requestReady = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId)
   {
        next(null,{
            code: Code.FIGHT.NO_ROOM_ID
        })
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var gameRoom = channel.room;
    console.log("readyListlength" + session.uid);
    if(gameRoom.readyList.indexOf(session.uid) == -1) {
        gameRoom.readyList.push(session.uid);
    }
    next(null, {
        code:Code.OK
    });
    ClientNet.pushReadyInfo(channel);
}

//玩家请求取消准备
handler.cancelReady = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        })
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var gameRoom = channel.room;
    var index = gameRoom.readyList.indexOf(session.uid);
    if(index != -1) {
        gameRoom.readyList.splice(index,1);
    }
    next(null, {
        code:Code.OK
    });
    ClientNet.pushReadyInfo(channel);
}

//玩家请求开始游戏
handler.requestStartFight = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var gameRoom = channel.room;
    if (gameRoom.playerCreator.uid != session.uid) {
        next(null, {
            code: Code.FIGHT.NOT_CREATOR,
            msg: "not you creator"
        });
    }
   /* if(gameRoom.haveOutAndLost()) {
        next(null, {
            code: Code.FIGHT.HAS_LOST_PLAYER,
            msg: "has lost or out player"
        });
    }*/

    if(gameRoom.isReady()) {
        if((gameRoom.status == "full") || (gameRoom.status == "fight" && gameRoom.gameStatus == "waitNext")) {
            var canStart = true;
            if (gameRoom.currCircle == 0) {
                canStart = gameRoom.playerCreator.useRoomCard(gameRoom.juShu);
            }
            if (canStart) {
                ClientNet.updateUserInfo(gameRoom.playerCreator.uid, gameRoom.playerCreator.sid, {roomCard: gameRoom.playerCreator.fightCardCount}, this.channelService);
                ClientNet.pushStartFight(channel);
                next(null,
                    {
                        code: Code.OK
                    });
            } else {
                next(null, {
                        code: Code.ROOM.ROOM_CARD_NOT_ENOUGH,
                        msg: "no enough roomCard"
                    }
                );
                ClientNet.msgTip(gameRoom.playerCreator.uid,gameRoom.playerCreator.sid,1,GameConst.LANGUAGE.NO_ENOUGH_CARD,this.channelService);
            }
        } else {
            next(null, {
                    code: Code.FIGHT.START_FIGHT_NO_CONDITION,
                    msg: "not in correct status"
                }
            );
        }
    } else {
        next(null, {
            code: Code.FIGHT.NOT_ALL_READY,
            msg: "not all ready"
         });
    }
}


//玩家请求大局打完后的总结果
//通知房间的最终胜负结果
//fightResult值 obj[type] = (parseInt(obj["type"])) + 1;
//总翻醒 obj["xing"]
//总子数 obj["ziShu"]
handler.requestTotalResult = function(msg,session,next) {
    var roomId = session.get('roomId');
    if (!roomId) {
        next(null, {
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var gameRoom = channel.room;
    if (!gameRoom) {
        return;
    }
    if (gameRoom.gameStatus != "waitEnd" && gameRoom.gameStatus != "over") {
        next(null, {
            code: Code.FIGHT.NOT_IN_WAIT_END_STATUS,
            msg: "not in waitEnd and over"
        });
        return;
    }
    gameRoom.gameStatus = "over";

    next(null,{
        code: Code.OK,
        data: gameRoom.fightResult
    });
}

//客户端。布局完毕进入战斗
handler.requestInstStart = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null,{
                code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var gameRoom = channel.room;
    var player = channel.userMap[session.uid];
    if(gameRoom.prepareList.indexOf(player.uid) == -1) {
        gameRoom.prepareList.push(player.uid);
    }
    next(null, {
        code:Code.OK
    });
    var totalNeed = gameRoom.getActPlayerCount();
    if(gameRoom.prepareList.length >= 1) {
        if(gameRoom.gameStatus == "waitLorder") {
            this.getLordPlayer(channel);
        }
        if(player.needReconnectFight) {
            ClientNet.startReconnectFight(this.channelService,gameRoom,player);
            player.needReconnectFight = false;
            if (gameRoom.gameStatus == "waitAuto"){
                this.cardPass(msg,session);
            } else if (gameRoom.gameStatus == "waitNext"){
                //已经被阻止了
                this.requestNextFight(msg,session);
            }
        }
    }
}

//获取当前房间状态
handler.requestFightStatus = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next(null,{
            code: Code.FIGHT.NO_ROOM_ID
        });
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next(null, {
            code: Code.FIGHT.NO_CHANNEL
        });
        return;
    }
    var room = channel.room;
    var player = channel.userMap[session.uid];
    var matchResult = room.currMatchResult;
    if(!! matchResult && !! matchResult[player.uid] && room.gameStatus == "waitAct"){
        this.channelService.pushMessageByUids('onCardCallBack', matchResult[player.uid],[{
            uid: player.uid,
            sid: player.sid
        }]);
    }
    if ((!!room.currPlayer)) {
        this.channelService.pushMessageByUids('onCurrPlayer',{uid:room.currPlayer.uid,status:room.gameStatus},[{
            uid: player.uid,
            sid: player.sid
        }]);
    }
    if (room.gameStatus == "waitAuto" || room.gameStatus == "waitAct"){
        this.channelService.pushMessageByUids('onShowCard',{id:room.currCardId} , [{
            uid: player.uid,
            sid: player.sid
        }]);
    }
    next(null,{
        code:Code.OK,
        userInfo:room.getClientUserInfo(player.uid),
        roomInfo:room.getClientInfo()
    });
}


//notify玩家暂时离开 (非掉线只是暂时切出去)
handler.outApp = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next();
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next();
        return;
    }
    var room = channel.room;
    var player = channel.userMap[session.uid];
    player.isOut = true;
    ClientNet.notePlayerOut(player,room,this.channelService);
    next();
}

//notify玩家暂时离开的回来了 (非掉线只是暂时切出去)
handler.inApp = function(msg,session,next) {
    var roomId = session.get('roomId');
    if(! roomId) {
        next();
        return;
    }
    var channel = this.channelService.getChannel(roomId, false);
    if(! channel){
        next();
        return;
    }
    var room = channel.room;
    var player = channel.userMap[session.uid];
    player.isOut = false;
    ClientNet.notePlayerIn(player,room,this.channelService);
    next();
    if(room.gameStatus == "waitNext" && room.requestNextList.length >= 1 && room.releaseRoomList.length == 0){
            ClientNet.pushStartFight(channel);
    }
}