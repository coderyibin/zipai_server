/**
 * Created by xieyq on 2017/3/28.
 * 玩家服务器的规则
 * 排的序号为 1-80
 1-40为小写     1-4为1
 41-80 为大写

 公式为int((i-1)/4)+1
 如序号5为int((5-1)/4)+1  则为2;

 */

//sendClient    uid:[{type:type,cardArr:[[]]}]
/*指令中有关棋牌中的type值均为1为开招，2为扫的开招，3为碰，4为吃 若有xiahuo代表有下伙，5为手牌的重招，6为扫牌后的重招,
 7代表过扫，8代表扫,9代表扫穿，91代表手牌中扫穿的重招，31表示碰的开招 , 32表示碰的重招

 在牌面上的牌中找  自摸的牌  10代表扫牌中的扫穿   101代表扫牌中扫穿的重招

 11代表普通胡牌，12代表点炮，13代表自摸,14代表天胡, 15代表地胡，16代表三龙五坎*/

//转换牌型cardId为1-80 ，返回的是当前牌的序号
var ArrayUtil = require("../util/arrayUtil");
var util = require("util");
module.exports.decodeCardId = function(cardId) {
    return parseInt((cardId-1)/4)+1;
}

//检测摸牌后，其他玩家的情况
module.exports.checkAutoCard = function(currPlayer,cardId,userList,minHu) {
    var currPlayerId = currPlayer.uid;
    var player;
    var matchList;
    //推送给客户端的数据,此时还没扣除手牌
    var sendClient = {};  //uid:[{type:type,cardArr:[[]]}]
    var saoChuanType;
    var saoChuanListIndex;
    var canHu;
    var i = 0;
    for (i = 0; i < userList.length; i++) {
        player = userList[i];
        player.outSideShaoHuId = 0;
        if(player.uid !=currPlayer.uid) {
            continue;
        }
        matchList = this.checkShaochuan(cardId,player.handCardList);
        saoChuanType = 9;
        if(! matchList) {
            child:for(var h = 0;h < player.shaoList.length;h ++) {
                matchList = this.checkShaochuan(cardId,player.shaoList[h]);
                if(!! matchList) {
                    saoChuanType = 10;
                    saoChuanListIndex = h;
                    break child;
                }
            }
        }
        if(!! matchList) {
            canHu = this.calcSpliceHu(minHu, player, cardId,saoChuanType);
            if(!! canHu) {
                if(saoChuanType == 10) {
                    player.outSideShaoHuId = cardId;
                }
                sendClient[player.uid]=[];
                sendClient[player.uid].push({type:13,cardArr:canHu,from: currPlayerId,id:cardId});
                sendClient = this.filterNoCard(sendClient,player.handCardList);
                return sendClient;
            }
            //扫穿
            sendClient[player.uid] = [];
            if(saoChuanType == 9){
                if (player.isKaiZhao) {
                    sendClient[player.uid].push(this.getSendData(91, matchList, player.handCardList));
                } else {
                    sendClient[player.uid].push(this.getSendData(saoChuanType, matchList, player.handCardList));
                }
            } else if(saoChuanType == 10) {
                if (player.isKaiZhao) {
                    sendClient[player.uid].push(this.getSendData(101, matchList, player.shaoList[saoChuanListIndex]));
                } else {
                    sendClient[player.uid].push(this.getSendData(saoChuanType, matchList, player.shaoList[saoChuanListIndex]));
                }
            }
            sendClient = this.filterNoCard(sendClient,player.handCardList);
            return sendClient;
        } else {
            matchList = this.checkShao(cardId, player.handCardList);
            if (!!matchList) {
                canHu = this.calcSpliceHu(minHu, player, cardId,0);
                if(!! canHu) {
                    sendClient[player.uid]=[];
                    sendClient[player.uid].push({type:13,cardArr:canHu,from: currPlayerId,id:cardId});
                    sendClient = this.filterNoCard(sendClient,player.handCardList);
                    return sendClient;
                }
                //扫
                sendClient[player.uid] = [];
                if (player.isIgnorPeng(cardId)) {
                    //过扫
                    sendClient[player.uid].push(this.getSendData(7, matchList, player.handCardList));
                } else {
                    sendClient[player.uid].push(this.getSendData(8, matchList, player.handCardList));
                }
                sendClient = this.filterNoCard(sendClient,player.handCardList);
                return sendClient;
            }
        }
    }
    return this.checkPostCard(currPlayer,cardId,userList,minHu,true);
}

//检测玩家出卡牌后，其他玩家的情况
module.exports.checkPostCard = function(currPlayer,cardId,userList,minHu,Auto) {
    var currPlayerId = currPlayer.uid;
    var rightUid = currPlayer.rightPlayer;
    var player;
    var matchList;
    //推送给客户端的数据,此时还没扣除手牌
    var sendClient;  //uid:[{type:type,cardArr:[[]]}]
    var hasAct = false;
    sendClient = this.checkHu(currPlayer,cardId,userList,minHu,Auto);
    if(!! sendClient) {
        return sendClient;
    }
    sendClient = {};
    parent:
        for (var i = 0; i < userList.length; i++) {
            player = userList[i];
            if(player.uid != currPlayerId || Auto) {
                matchList =this.checkKaizhao(cardId,player.handCardList);
                if(!! matchList) {
                    //开招
                    sendClient = {};
                    sendClient[player.uid] = [];
                    if (player.isKaiZhao) {
                        sendClient[player.uid].push(this.getSendData(5, matchList, player.handCardList));
                    } else {
                        sendClient[player.uid].push(this.getSendData(1, matchList, player.handCardList));
                    }
                    hasAct = true;
                    sendClient = this.filterNoCard(sendClient,player.handCardList);
                    return sendClient;
                } else {
                    var saoKaiZhaoIndex;
                    child:
                        for(var h = 0;h < player.shaoList.length;h ++) {
                            matchList = this.checkKaizhao(cardId,player.shaoList[h]);
                            if(!! matchList) {
                                saoKaiZhaoIndex = h;
                                break child;
                            }
                        }
                    if (!! matchList) {
                        //扫的开招
                        sendClient = {};
                        sendClient[player.uid] = [];
                        if (player.isKaiZhao) {
                            sendClient[player.uid].push(this.getSendData(6,matchList,player.shaoList[saoKaiZhaoIndex]));
                        } else {
                            sendClient[player.uid].push(this.getSendData(2,matchList,player.shaoList[saoKaiZhaoIndex]));
                        }
                        hasAct = true;
                        sendClient = this.filterNoCard(sendClient,player.handCardList);
                        return sendClient;
                    } else {
                        if(Auto) {
                            //摸的牌，处理碰的开招
                            var pengKaiZhaoIndex;
                            child:
                                for(var m = 0;m < player.pengList.length;m ++) {
                                    matchList = this.checkKaizhao(cardId,player.pengList[m]);
                                    if(!! matchList) {
                                        pengKaiZhaoIndex = m;
                                        break child;
                                    }
                                }
                            if(!! matchList) {
                                //碰的开招
                                sendClient = {};
                                sendClient[player.uid] = [];
                                if (player.isKaiZhao) {
                                    sendClient[player.uid].push(this.getSendData(32,matchList,player.pengList[pengKaiZhaoIndex]));
                                } else {
                                    sendClient[player.uid].push(this.getSendData(31,matchList,player.pengList[pengKaiZhaoIndex]));
                                }
                                hasAct = true;
                                sendClient = this.filterNoCard(sendClient,player.handCardList);
                                return sendClient;
                            }
                        }
                        if(! player.checkCardIgnore(3,cardId)) {
                            matchList = this.checkPeng(cardId, player.handCardList);
                            if (!!matchList) {
                                //碰
                                if (!sendClient[player.uid]) {
                                    sendClient[player.uid] = [];
                                }
                                sendClient[player.uid].push(this.getSendData(3, matchList, player.handCardList));
                                hasAct = true;
                            }
                        }
                        if (player.uid == currPlayerId || player.uid == rightUid) {  //只有自己或下家可以吃
                            if (!player.checkCardIgnore(4, cardId)) {
                                matchList = this.checkChi(cardId, player.handCardList);
                                if (!!matchList) {
                                    //吃

                                    var sendObj = this.getSendData(4, matchList, player.handCardList);
                                    var xiahuoObj = this.getXiaHuo(10, cardId, sendObj.cardArr, player.handCardList,0);
                                    if (!! xiahuoObj) {
                                        if(!! xiahuoObj["next"]) {
                                            sendObj["next_xiahuo"] = xiahuoObj["next"];
                                            delete xiahuoObj["next"];
                                        }
                                        sendObj["xiahuo"] = xiahuoObj;
                                    }
                                    sendObj = this.filterChiResult(sendObj,cardId,player.handCardList);
                                    if(!! sendObj) {
                                        sendObj = filterLastChi(sendObj,player.handCardList);
                                    }
                                    if(!! sendObj) {
                                        if (!sendClient[player.uid]) {
                                            sendClient[player.uid] = [];
                                        }
                                        sendClient[player.uid].push(sendObj);
                                        hasAct = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    if(hasAct) {
        sendClient = this.filterNoCard(sendClient,player.handCardList);
        return   sendClient;
    } else {
        return null;
    }
}

//清除当下去之后手上没牌的情况
module.exports.filterNoCard = function(obj,handleList){
    if(handleList.length > 3) {
        return obj;
    }
    var childArr;
    var childObj;
    for(var prop in obj){
        childArr = obj[prop];
        if(childArr.length == 1){
            for(var i = 0;i<childArr.length;i ++){
                childObj = childArr[i];
                if(childObj.cardArr.length == 1){
                    if(childObj.cardArr[0].length == handleList.length){
                        delete obj[prop];
                        var count = 0;
                        for(var nextProp in obj){
                            count ++;
                        }
                        if(count == 0){
                            return null;
                        } else {
                            return obj;
                        }
                    } else {
                        return obj;
                    }
                }
            }
        } else {
            return obj;
        }
    }
    return obj;
}


//过滤吃的结果  吃的除下伙，手上已有的不弹吃
module.exports.filterChiResult = function(chiObj,cardId,handList)
{
    if(handList.indexOf(cardId) == -1) {
        return chiObj;
    }
    var cardArr =  chiObj.cardArr;
    var xiaHuoObj = chiObj.xiahuo;
    var nextXiaHuo = chiObj.next_xiahuo;
    var cloneHandList;
    var filterIdArr = [];
    var i = 0;
    var childArr;
    var index;
    var prop;
    var hasOther = false
    var xiahuoMore;
    for (i = 0;i < cardArr.length;i ++) {
        childArr = cardArr[i];
        cloneHandList = handList.slice(0);
        if(!! xiaHuoObj && xiaHuoObj.hasOwnProperty(String(i))) {
            //这块主要处理两次下伙后还有多一张这种牌，不能下伙。所以不能吃
            xiahuo: for (var k = 0; k < xiaHuoObj[i].length; k++) {
                if (!!nextXiaHuo && nextXiaHuo.hasOwnProperty(String(i)) && nextXiaHuo[i].hasOwnProperty(String(k))) {
                    continue xiahuo;
                }
                xiahuoMore = true;
                var xiaHCloneHandList = cloneHandList.slice(0);
                for(var h = 0;h < childArr.length;h ++) {
                    index = xiaHCloneHandList.indexOf(childArr[h]);
                    if (index != -1) {
                        xiaHCloneHandList.splice(index,1);
                    }
                }
              xiahuoChild:  for( h = 0;h < xiaHuoObj[i].length;h ++) {
                    if (!!nextXiaHuo && nextXiaHuo.hasOwnProperty(String(i)) && nextXiaHuo[i].hasOwnProperty(String(h))) {
                        continue xiahuoChild;
                    }
                    var tempCloneHandList = xiaHCloneHandList.slice(0);
                    for(var n = 0;n < xiaHuoObj[i][h].length;n ++) {
                        index = tempCloneHandList.indexOf(xiaHuoObj[i][h][n]);
                        if (index != -1) {
                            tempCloneHandList.splice(index,1);
                        }
                    }
                    index =  tempCloneHandList.indexOf(cardId);
                    if(index != -1) {
                        xiaHuoObj[i].splice(h,1);
                        if (!!nextXiaHuo && nextXiaHuo.hasOwnProperty(String(i)) && nextXiaHuo[i].hasOwnProperty(String(h))) {
                           delete nextXiaHuo[i][h];
                            hasOther = false;
                            for (prop in nextXiaHuo[i]) {
                                hasOther = true;
                                if (parseInt(prop) > h) {
                                    nextXiaHuo[i][String(parseInt(prop) - 1)] = nextXiaHuo[i][prop];
                                    delete nextXiaHuo[i][prop];
                                }
                            }
                            if(! hasOther){
                                delete nextXiaHuo[i];
                            }
                        }
                        h --;
                        if(xiaHuoObj[i].length == 0) {
                            filterIdArr.push(i);
                            if (!!nextXiaHuo && nextXiaHuo.hasOwnProperty(String(i))) {
                                delete nextXiaHuo[i];
                                hasOther = false;
                                for (prop in nextXiaHuo) {
                                    hasOther = true;
                                    if (parseInt(prop) > i) {
                                        nextXiaHuo[String(parseInt(prop) - 1)] = nextXiaHuo[prop];
                                        delete nextXiaHuo[prop];
                                    }
                                }
                                if(! hasOther){
                                    delete chiObj["next_xiahuo"];
                                }
                            }
                            break xiahuo;
                        }
                    }
                }
            }
            continue;
        }
        for(var j = 0;j < childArr.length;j ++) {
            index = cloneHandList.indexOf(childArr[j]);
            if (index != -1) {
                cloneHandList.splice(index,1);
            }
        }
        if(cloneHandList.indexOf(cardId) != -1) {
            //需要清除的数组索引
            filterIdArr.push(i);
        }
    }
    for(i = 0;i < filterIdArr.length;i ++) {
        index= filterIdArr[i];
        cardArr.splice(index - i,1);
        hasOther =false;
        for(prop in xiaHuoObj) {
            hasOther = true;
            if(parseInt(prop) > index) {
                xiaHuoObj[String(parseInt(prop)-1)] = xiaHuoObj[prop];
                delete xiaHuoObj[prop];
            }
        }
        if(! hasOther){
            delete chiObj["xiahuo"];
        }
    }
    if(cardArr.length == 0 ) {
        return null;
    }
    return chiObj;
}

//过滤掉吃完如果只剩最后三个不能动的，且不能胡的，这会不让吃。  会执行到这里就是不能胡的情况，所以不考虑胡数
var filterLastChi = function(chiObj,handList) {
    var cardArr =  chiObj.cardArr;
    var xiaHuoObj = chiObj.xiahuo;
    var nextXiaHuo = chiObj.next_xiahuo;
    var childArr;
    var cloneHandList;
    var tempCardId;
    var tempIndex;
    var tempCardArr;
    for(var i = 0;i < cardArr.length;i ++) {
        childArr = cardArr[i];
        cloneHandList = handList.slice(0);
        for(var m = 0;m < childArr.length;m ++) {
            tempIndex = cloneHandList.indexOf(childArr[m]);
            if(tempIndex != -1) {
                cloneHandList.splice(tempIndex,1);
            }
        }
        if(!! xiaHuoObj && xiaHuoObj.hasOwnProperty(String(i))) {
            for(var j = 0;j < xiaHuoObj[i].length;j ++) {
                var xhCloneHandList = cloneHandList.slice(0);
                for (var k = 0; k < xiaHuoObj[i][j].length; k++) {
                    tempCardId = xiaHuoObj[i][j][k];
                    tempIndex = xhCloneHandList.indexOf(tempCardId);
                    if (tempIndex != -1) {
                        xhCloneHandList.splice(tempIndex, 1);
                    }
                }
                if (!!nextXiaHuo && nextXiaHuo.hasOwnProperty(String(i)) && nextXiaHuo[i].hasOwnProperty(String(j))) {
                    for (var l = 0; l < nextXiaHuo[i][j].length; l++) {
                        var nextXhCloneList = xhCloneHandList.slice(0);
                        tempCardArr = xiaHuoObj[i][j][l];
                        for (var m = 0; m < tempCardArr.length; m++) {
                            tempCardId = tempCardArr[m];
                            tempIndex = nextXhCloneList.indexOf(tempCardId);
                            if (tempIndex != -1) {
                                nextXhCloneList.splice(tempIndex, 1);
                            }
                        }
                        if(checkOnlyLK(nextXhCloneList)) {
                            return null;
                        }
                    }
                } else {
                    if(checkOnlyLK(xhCloneHandList)) {
                        return null;
                    }
                }
            }
        } else {
            if(checkOnlyLK(cloneHandList)) {
                return null;
            }
        }
    }
    return chiObj;
}

//判断牌中是否只有 三个一样的或者四个一样的或者没牌了。这样就不能吃了
var checkOnlyLK = function(cardList) {
    if(cardList.length == 0) {
        return true;
    }
    var repeatObj = {};
    var cardId;
    for (var i = 0; i < cardList.length; i++) {
        cardId = cardList[i];
        if(!repeatObj.hasOwnProperty(cardId)) {
            repeatObj[cardId] = 0;
        }
        repeatObj[cardId] ++;
    }
    for(var prop in repeatObj) {
        if(repeatObj[prop] < 3) {
            return false;
        }
    }
    return true;
}
//处理回调回来的规则数据card发送给客户端
//最后一个cardId代表下伙得将手牌中已有的牌一并放进去
module.exports.getSendData = function(type,indexArr,cardList,cardId)
{
    var handArr;
    var tempCardIdArr = [];
    var tempChildIDArr = [];
    for(var i = 0;i < indexArr.length;i ++) {
        handArr = indexArr[i];
        tempChildIDArr = [];
        for(var j = 0;j < handArr.length;j ++) {
            tempChildIDArr.push (cardList[handArr[j]]);
        }
        if(!! cardId) {
            //下伙需要将出牌的数字也是玩家自己的牌，得加入
            tempChildIDArr.push(cardId);
        }
        tempChildIDArr = tempChildIDArr.sort(ArrayUtil.sortNumber);
        tempCardIdArr.push(tempChildIDArr);
    }
    return {type:type,cardArr:tempCardIdArr};
}


//判断是否碰
module.exports.checkPeng = function(cardId,cardIdList) {
    return this.checkRule(cardIdList,[[cardId,cardId]]);
}


//判断是否有吃
module.exports.checkChi = function(cardId,cardIdList,cardHuId) {
    var filtArr = this.filterChiList(cardIdList,cardHuId);
    cardId = parseInt(cardId);
    var arr;
    if (cardId == 1 || cardId == 11) {
        arr = [[cardId + 1, cardId + 2]];
    } else if (cardId == 2 || cardId == 12) {
        arr = [[cardId + 5,cardId + 8], [cardId - 1, cardId + 1],[cardId + 1, cardId + 2]];  //得把胡数大的放前面
    } else if (cardId == 10 || cardId == 20) {
        arr = [[cardId - 3,cardId - 8],[cardId - 2, cardId - 1]];
    } else if (cardId == 9 || cardId == 19) {
        arr = [[cardId - 1, cardId + 1], [cardId - 2, cardId - 1]]
    } else {
        arr = [[cardId + 1, cardId + 2], [cardId - 1, cardId + 1], [cardId - 2, cardId - 1]];
        if(cardId == 7 || cardId == 17) {
            arr.push([cardId - 5,cardId + 3]);
        }
    }
    if(cardId>10) {
        arr.push([cardId,cardId-10]);
        arr.push([cardId-10,cardId-10]);
    } else {
        arr.push([cardId,cardId+10]);
        arr.push([cardId+10,cardId+10]);
    }
    var childArr;
    out:
        for(var i = 0;i < arr.length;i ++) {
            childArr = arr[i];
            inter:
                for(var j = 0;j < childArr.length;j ++) {
                    if(filtArr.indexOf(childArr[j]) != -1) {
                        arr.splice(i,1);
                        i--;
                        break inter;
                    }
                }
        }
    return this.checkRule(cardIdList,arr);
}

//清理掉吃判断的牌  如 有3个一样的牌，这种就固定的，不能被吃
module.exports.filterChiList = function(cardList,cardHuId) {
    var obj = {};
    var beFiltArrId = [];
    for(var i = 0;i < cardList.length;i ++) {
        if( ! obj[cardList[i]]) {
            obj[cardList[i]] = 0 ;
        }
        obj[cardList[i]]++;
        if( obj[cardList[i]] >= 3 && beFiltArrId.indexOf(cardList[i]) == -1 && cardList[i] != cardHuId) {
            beFiltArrId.push(cardList[i]);
        }
    }
    return beFiltArrId;
}

//判断是否有开招
module.exports.checkKaizhao = function(cardId,cardIdList) {
    var matchList = this.checkRule(cardIdList,[[cardId,cardId,cardId]]);
    return matchList;
}


//判断是否有扫
module.exports.checkShao = function(cardId,cardIdList) {
    var arr = [[cardId,cardId]];
    return this.checkRule(cardIdList,arr);
}

//判断是否有扫穿
module.exports.checkShaochuan = function(cardId,cardIdList) {
    var arr = [[cardId,cardId,cardId]];
    return this.checkRule(cardIdList,arr);
}


//判断下伙的部分内容
//类型，当前出的牌，要被吃的牌数组 ，，玩家手上的牌
module.exports.getXiaHuo = function(type,cardId,chidIdArr,cardIdList,index) {
    var cardIndex = cardIdList.indexOf(cardId);
    if(cardIndex == -1) {
        return null;
    }
    var tempArr;
    var nowCardList;
    var id;
    var returnObj = null;
    var matchList;
    var numObj;
    var nextXiaHuo;
    for(var i = 0;i < chidIdArr.length;i ++) {
        nowCardList = cardIdList.slice(0);
        tempArr = chidIdArr[i].slice(0);
        for (var j = 0; j < tempArr.length; j++) {
            id = nowCardList.indexOf(tempArr[j]);
            if (id != -1) {
                nowCardList.splice(id, 1);
            }
        }
        id = nowCardList.indexOf(cardId);
        if(id != -1) {
            //清除掉吃的两张牌后，得判断手上是否还有cardId供下伙，有将此cardId 在手牌中去除，并再次判断，否则不能下伙
            nowCardList.splice(id, 1);
            matchList = this.checkChi(cardId, nowCardList);
            if (!!matchList) {
                numObj = this.getSendData(type, matchList, nowCardList,cardId);
                if(! returnObj) {
                    returnObj = {};
                }
                returnObj[i] = numObj.cardArr;
                //计算再次下伙
                nowCardList.push(cardId);
                nextXiaHuo = this.getXiaHuo(type,cardId,numObj.cardArr,nowCardList,i);
                if(!! nextXiaHuo) {
                    //如果存在再次下伙
                    if(! returnObj["next"]) {
                        returnObj["next"] = {};
                    }
                    returnObj["next"][i] = nextXiaHuo;
                }
            }
        }
    }
    return returnObj;
}

// cardId为当前出的牌，cardIdlist为手牌  如果能碰，返回数组中  值代表在手牌中的索引位置
module.exports.checkRule = function(cardIdList,ruleList) {
    var sameNum = 0;
    var matchArr = [];  //小配对
    var matchArrList = []; //包含所有的小配对
    var tempRuleArr;
    outer:  for(var i = 0;i < ruleList.length;i ++) {
        tempRuleArr = ruleList[i];
        matchArr = [];
        mid:  for (var j = 0; j < tempRuleArr.length; j++) {
            inter:  for (var k = 0; k < cardIdList.length; k++) {
                if (cardIdList[k] == tempRuleArr[j]) {
                    if( matchArr.indexOf(k) == -1) {
                        matchArr.push(k);
                        break inter;
                    }
                }
            }
        }
        if(ruleList[i].length == matchArr.length) {
            matchArrList.push(matchArr);
        }
    }
    if(matchArrList.length > 0 ) {
        return matchArrList;
    } else {
        return null;
    }
}


//检测有胡牌信息
//玩家ID，当前卡牌ID， 玩家列表，玩家下一家，最小胡数，是不是可以算上自己，还有可以参与胡计算的牌数，如碰和扫
module.exports.checkHu = function(currPlayer,cardId,userList,minHu,Auto) {
    var currPlayerId = currPlayer.uid;
    var rightUid = currPlayer.rightPlayer;
    var player;
    var canHu = false;
    if (Auto) {
        //当前玩家
        for (var i = 0; i < userList.length; i++) {
            if (userList[i].uid == currPlayerId) {
                player = userList[i];
                break;
            }
        }
        canHu = this.calcHu(minHu, player, cardId,currPlayer.uid,Auto,false,false);
    }
    if(! canHu) {
        //当前玩家的下家
        for(var i = 0;i < userList.length;i++) {
            if(userList[i].uid == rightUid) {
                player = userList[i];
                break;
            }
        }
        canHu = this.calcHu(minHu, player, cardId,currPlayer.uid,Auto,false,false);
    }
    if(! canHu) {
        //当前玩家的下家的下家
        for(var i = 0;i < userList.length;i++) {
            if(userList[i].uid != rightUid && userList[i].uid != currPlayerId) {
                player = userList[i];
                break;
            }
        }
        canHu = this.calcHu(minHu, player, cardId,currPlayer.uid,Auto,false,false);
    }

    if(!! canHu) {
        //canHu是一个胡的组合序列
        var sendClient = {};
        //如果可以胡的话
        sendClient[player.uid] = [];
        var huType;
        if(Auto){
            //摸牌时
            if(player.uid == currPlayerId) {
                //自摸
                huType = 13;
            } else{
                //普通胡牌
                huType = 11;
            }
        } else {
            //点炮
            huType = 12;
        }
        sendClient[player.uid].push({type:huType,cardArr:canHu,from: currPlayerId,id:cardId,outSide:player.outSideKZHuId});
        return sendClient;
    } else {
        return null;
    }
}


//计算该玩家是否可以胡
//minHu 最低的起胡数,currPlayer,当前计算的玩家，cardId当前进来的牌可不可以胡,currPlayerUid当前轮到谁,Auto表是摸牌，cardIdList为手牌,fourAgaine有四个的话得再判断一下
module.exports.calcHu = function(minHu,player,cardId,currPlayerUid,Auto,spliceEnd,fourAgain) {
    var currHu = player.rate;
    var cardList = player.handCardList.slice(0);
    if(spliceEnd) {
        cardList = cardList.slice(0,cardList.length-1);
    }
    var isKaiZhao = player.isKaiZhao;
    var repeatObj = {};
    var aloneArr = [];
    var overList = [];
    //先判断是否成双或成三或成四
    var mustFourAgain = false; //是否需要判断一次四个
    cardList.push(cardId);
    var i = 0;
    for (i = 0; i < cardList.length; i++) {
        cardId = cardList[i];
        if(!repeatObj.hasOwnProperty(cardId)) {
            repeatObj[cardId] = 0;
        }
        repeatObj[cardId] ++;
    }
    //胡数后面再算，可以先不算=等最终的过程列表出来就可以算了=============================================================
    var tempCardId;
    for(var prop in repeatObj) {
        tempCardId = parseInt(prop);
        switch (repeatObj[prop] ) {
            case 1:
                aloneArr.push(tempCardId);
                break;
            case 2:
                aloneArr.push(tempCardId);
                aloneArr.push(tempCardId);
                break;
            case 3:
                if (tempCardId == cardId) {
                    //将只有两张一样的也放进独立中
                    aloneArr.push(tempCardId);
                    aloneArr.push(tempCardId);
                    aloneArr.push(tempCardId);
                } else {
                    overList.push([tempCardId,tempCardId,tempCardId]);
                }
                break;
            case 4:
                if(! isKaiZhao) {
                    isKaiZhao = true;
                }
                if(tempCardId == cardId) {
                    //四个的情况。第二次就将四个拆分成三个。然后看是否能胡
                    if(fourAgain) {
                        aloneArr.push(tempCardId);
                        overList.push([tempCardId,tempCardId,tempCardId]);
                    } else {
                        mustFourAgain = true;
                        overList.push([tempCardId, tempCardId, tempCardId, tempCardId]);
                    }
                } else {
                    overList.push([tempCardId, tempCardId, tempCardId, tempCardId]);
                }
                break;
            default:
                break;
        }
    }
    var huBool;
    aloneArr.sort(ArrayUtil.sortNumber);
    if(isKaiZhao) {
        //判断3n+2
        huBool = this.calcHuPengFun(aloneArr,1,overList,cardId);
    } else {
        //判断3n
        huBool = this.calcHuPengFun(aloneArr,0,overList,cardId);
    }
    player.outSideKZHuId = 0;
    if(! huBool) {
        var canCheck = Auto;
        var kaiZhaoValue;
        if (! Auto) {
            kaiZhaoValue = this.haveOutKaiZhao(player, cardId);
            if (kaiZhaoValue == 1) {
                canCheck = true;
            }
        }
        if (canCheck) {
            //当存在碰的开招或扫的开招，直接判断手牌是否可以胡
            var kaiZhaoValue = this.haveOutKaiZhao(player, cardId);
            if (kaiZhaoValue != 0) {
                var nowIndex = aloneArr.indexOf(cardId);
                if (nowIndex != -1) {
                    //移除放入手牌的判断
                    aloneArr.splice(nowIndex, 1);
                }
                huBool = this.calcHuPengFun(aloneArr, 1, overList, cardId);
                if (!!huBool) {
                    player.outSideKZHuId = cardId;
                    if (kaiZhaoValue == 1) {
                        //扫的开招
                        currHu += this.getRate(true, 2, [cardId], null, null);
                    } else if (kaiZhaoValue == 2) {
                        //碰的开招
                        currHu += this.getRate(true, 31, [cardId], null, null);
                    }
                }
            }
        }
    }
    if(!! huBool) {
        var isMine = (currPlayerUid == player.uid);
        var totalHuShu = this.calcListScore(huBool,isMine,Auto,cardId);
        //判断胡数是否足够

        if((totalHuShu.total + currHu) >= minHu) {
            player.currFightHuShu = (totalHuShu.total + currHu);
            player.currEachHuList = totalHuShu.each;
            return huBool;
        }
    }
    if(mustFourAgain) {
        //四个 可成三取一配对的特殊处理方式
        return this.calcHu(minHu,player,cardId,currPlayerUid,Auto,spliceEnd,mustFourAgain);
    }
    return null;
}

///=====================================================================================================================================
///=====================================================================================================================================
//计算牌中前两位是否是对子   当来一张牌有多种凑牌胡法，胡数还不一样的原因，所以得先算3张，吃的得先算有胡数的，如2 7 10，和123
//duiNum就是对的个数可以有几个
module.exports.calcHuPengFun = function(cardList,duiNum,overList,cardHuId) {
    var nowOverList = overList.slice(0);
    var cloneList = cardList.slice(0);
    var nowDuiNum = duiNum;
    if (cloneList.length <= 2) {
        switch (cloneList.length) {
            case 0:
                return nowOverList;
                break;
            case 1:
                return null;
                break;
            case 2:
                if (nowDuiNum == 1) {
                    if (cloneList[0] == cloneList[1]) {
                        nowOverList.push([cloneList[0],cloneList[1]]);
                        return nowOverList;
                    }
                }
                return null;
                break;
            default:
                break;
        }
    }
    var childCardLIst;
    var canHu = false;
    var threeCloneList = cardList.slice(0);
    var threeOverList = overList.slice(0);
    //首张用以三张，看是否能胡牌
    if (threeCloneList[0] == threeCloneList[1] && threeCloneList[1] == threeCloneList[2]) {
        childCardLIst = threeCloneList.slice(3);
        threeOverList.push([threeCloneList[0],threeCloneList[1],threeCloneList[2]]);
        canHu = this.calcHuPengFun(childCardLIst, nowDuiNum,threeOverList,cardHuId);
    }
    if (canHu) {
        return canHu;
    }
    //首张用以碰，看是否能胡牌
    var twoCloneList = cardList.slice(0);
    var twoOverList = overList.slice(0);
    var duiSub = false;
    if (nowDuiNum > 0  && twoCloneList[0] == twoCloneList[1]) {
        childCardLIst = twoCloneList.slice(2);
        nowDuiNum = 0;
        duiSub = true;
        twoOverList.push([twoCloneList[0],twoCloneList[1]]);
        canHu = this.calcHuPengFun(childCardLIst, nowDuiNum,twoOverList,cardHuId);
    }

    if(canHu) {
        return canHu;
    }
    nowDuiNum = duiNum;
    //首张用以顺子，看是否能胡牌
    var listCloneList =  cardList.slice(0);
    var listOverList = overList.slice(0);
    canHu = this.calcHuListFun(listCloneList,nowDuiNum,listOverList,cardHuId);
    if(canHu) {
        return canHu;
    }
    return null;
}

//计算牌中是否是有顺子
module.exports.calcHuListFun = function(cardList,duiNum,overList,cardHuId)
{
    var remainList = cardList.slice(0);
    var listOverList = overList.slice(0);
    var cardId = remainList.shift();
    var matchList = this.checkChi(cardId,remainList,cardHuId);
    var childArr;
    var childList;
    var canHu;
    var tempOverList;
    var startIdListIndex;
    var currListOverLength = listOverList.length;
    if( !! matchList ) {
        for (var i = 0; i < matchList.length; i++) {
            childArr = matchList[i];
            tempOverList = [];
            listOverList= listOverList.slice(0,currListOverLength);
            childArr.sort(ArrayUtil.sortNumber);
            childList = remainList.slice(0); //备份一份除第一个后后绪的
            for (var j = 0; j < childArr.length; j++) {
                tempOverList.push(childList[childArr[j]-j]);
                childList.splice(childArr[j] - j, 1);
            }
            tempOverList.push(cardId);
            listOverList.push(tempOverList);
            if (childList.length == 0) {
                return listOverList;
            } else if(childList.length < 3) {
                if(childList.length ==2 && duiNum > 0 && childList[0] == childList[1])
                {
                    listOverList.push([childList[0], childList[1]]);
                    return listOverList;
                } else {
                    return null;
                }
            } else {
                canHu = this.calcHuPengFun(childList,duiNum,listOverList,cardHuId);
                if(canHu) {
                    return canHu;
                }
            }
        }
    }
}

//计算每个序列的胡数
module.exports.getHandHuShu = function(cardArr,isSao,cardId)
{
    var huShu = 0;
    switch(cardArr.length) {
        case 3:
            if (cardArr[0] == cardArr[1] && cardArr[1] == cardArr[2]) {
                if (cardArr[0] == cardId) {
                    if (isSao) {
                        huShu = this.calcSBScore(cardArr[0], 3, 6);
                    }
                    else {
                        huShu = this.calcSBScore(cardArr[0], 1, 3);
                    }
                }
                else {
                    huShu = this.calcSBScore(cardArr[0], 3, 6);
                }
            } else if (ArrayUtil.equalArr(cardArr, [2, 7, 10]) || ArrayUtil.equalArr(cardArr, [12, 17, 20]) || ArrayUtil.equalArr(cardArr, [1, 2, 3]) || ArrayUtil.equalArr(cardArr, [11, 12, 13])) {
                huShu = this.calcSBScore(cardArr[0], 3, 6);
            }
            break;
        case 4:
            if (cardArr[0] == cardId) {
                if (isSao) {
                    huShu = this.calcSBScore(cardArr[0], 9, 12);
                } else {
                    huShu = this.calcSBScore(cardArr[0], 6, 9);
                }
            } else {
                huShu = this.calcSBScore(cardArr[0], 9, 12);
            }
            break;
    }
    return huShu;
}

//列表,几个为一起，小子分数，大子分数
module.exports.calcSBScore = function(cardId,sScore,bScore) {
    if(parseInt(cardId) > 10) {
        return bScore;
    }
    return sScore;
}

//手上是否有扫，有扫不需要将牌翻出来
module.exports.getCardVisible = function(matchResult) {
    var obj;
    var arr;
    for(var prop in matchResult) {
        arr = matchResult[prop];
        for(var i = 0;i < arr.length;i ++) {
            obj = arr[i];
            if(parseInt(obj.type) == 7 || parseInt(obj.type) == 8 || parseInt(obj.type) == 9 || parseInt(obj.type) == 91 || parseInt(obj.type) == 10 || parseInt(obj.type) == 101) {
                return 0;
            }
        }
    }
    return 1;
}
// 计算玩家的胡数
/* 小三张对：打出为1胡；拿在手上，扫的为3胡
 大三张对：打出为3胡；拿在手上，扫的为6胡
 小三连续：只有特殊牌型：一二三，二七十，才算胡数，打出或手上都是3胡
 大三连续：只有特殊牌型：壹贰叄，贰柒拾，才算胡数，打出或手上都是6胡
 小四张：打出为6胡；拿在手上，扫的为9胡
 大四张：打出为9胡；拿在手上，扫的为12胡*/
//获取每组牌的胡数
//类型，牌的大小
//sub代表是否要减去前面的
module.exports.getRate = function(sub,type,nowIdArr,xiahuo,next_xiahuo,chongZhao)
{
    var nowRate = 0;
    switch(type) {
        case 1:
            nowRate += this.calcSBScore(nowIdArr[0],6,9);
            break;
        case 2:
            nowRate += this.calcSBScore(nowIdArr[0],6,9);
            if(sub) {
                nowRate -= this.calcSBScore(nowIdArr[0],3,6);
            }
            break;
        case 3:
            nowRate += this.calcSBScore(nowIdArr[0],1,3);
            break;
        case 4:
            nowIdArr = nowIdArr.sort(ArrayUtil.sortNumber);
            if(ArrayUtil.equalArr(nowIdArr, [2,7,10]) ||ArrayUtil.equalArr(nowIdArr, [12,17,20])|| ArrayUtil.equalArr(nowIdArr, [1,2,3])|| ArrayUtil.equalArr(nowIdArr, [11,12,13])) {
                nowRate += this.calcSBScore(nowIdArr[0],3,6);
            }
            if(!! xiahuo) {
                if(ArrayUtil.equalArr(xiahuo, [2,7,10]) ||ArrayUtil.equalArr(xiahuo, [12,17,20])|| ArrayUtil.equalArr(xiahuo, [1,2,3])|| ArrayUtil.equalArr(xiahuo, [11,12,13])) {
                    nowRate += this.calcSBScore(nowIdArr[0],3,6);
                }
            }
            if(!! next_xiahuo)
            {
                if(ArrayUtil.equalArr(next_xiahuo, [2,7,10]) ||ArrayUtil.equalArr(next_xiahuo, [12,17,20])|| ArrayUtil.equalArr(next_xiahuo, [1,2,3])|| ArrayUtil.equalArr(next_xiahuo, [11,12,13])) {
                    nowRate += this.calcSBScore(nowIdArr[0],3,6);
                }
            }
            break;
        case 5:
            nowRate += this.calcSBScore(nowIdArr[0],6,9);
            break;
        case 6:
            nowRate += this.calcSBScore(nowIdArr[0],6,9);
            if(sub) {
                nowRate -= this.calcSBScore(nowIdArr[0], 3, 6);
            }
            break;
        case 7:
            nowRate += this.calcSBScore(nowIdArr[0],3,6);
            break;
        case 8:
            nowRate += this.calcSBScore(nowIdArr[0],3,6);
            break;
        case 9:
            nowRate += this.calcSBScore(nowIdArr[0],9,12);
            break;
        case 10:
            //扫牌中的扫穿
            nowRate += this.calcSBScore(nowIdArr[0],9,12);
            if(sub) {
                nowRate -= this.calcSBScore(nowIdArr[0], 3, 6);
            }
            break;
        case 101:
            nowRate += this.calcSBScore(nowIdArr[0],9,12);
            if(sub) {
                nowRate -= this.calcSBScore(nowIdArr[0], 3, 6);
            }
            break;
        case 91:
            nowRate += this.calcSBScore(nowIdArr[0],9,12);
            break;
        case 31:
            nowRate += this.calcSBScore(nowIdArr[0],6,9);
            if(sub) {
                nowRate -= this.calcSBScore(nowIdArr[0], 1, 3);
            }
            break;
        case 32:
            nowRate += this.calcSBScore(nowIdArr[0],6,9);
            if(sub) {
                nowRate -= this.calcSBScore(nowIdArr[0], 1, 3);
            }
            break;
        default:break;
    }
    if(!!chongZhao) {
        var childArr;
        var cardIndex;
        for(var i = 0;i < chongZhao.length;i ++) {
            childArr = chongZhao[i];
            nowRate += this.calcSBScore(childArr[0],9,12);
        }
    }
    return nowRate;
}

//判断是否重招
module.exports.isChongZhao = function(type) {
    return type == 5 || type == 6|| type == 91 || type == 32 || type == 101;
}

//判断是否开招
module.exports.isKaiZhao = function(type) {
    return type == 1 || type == 2|| type == 31 || type == 9 || type == 10 ;
}

//判断是否是胡
module.exports.isHuType = function(type) {
    return type == 11 || type == 12|| type == 13 || type == 14 || type == 15 || type == 16;
}

//手上是否有胡的牌，有于判断地胡
module.exports.resultHasHu = function(matchResult) {
    var obj;
    var arr;
    for(var prop in matchResult) {
        arr = matchResult[prop];
        for(var i = 0;i < arr.length;i ++) {
            obj = arr[i];
            if(this.isHuType(parseInt(obj.type))) {
                return prop;
            }
        }
    }
    return null;
}

//判断所有玩家是否有带三龙五坎的
module.exports.calcUserSLWK = function(userList,currPlayer) {
    var list =  this.isSLWKan(currPlayer.handCardList)
    var totalHuShu;
    if(!! list) {
        totalHuShu = this.calcListScore(list,true,true,0);
        currPlayer.currFightHuShu = totalHuShu.total ;
        currPlayer.currEachHuList = totalHuShu.each;
        return {player:currPlayer,list:list};
    }
    var nowPlayer;
    for(var i = 0;i < userList.length;i ++) {
        if(userList[i].uid == currPlayer.rightPlayer) {
            nowPlayer =userList[i];
        }
    }
    list =  this.isSLWKan(nowPlayer.handCardList);
    if(!! list) {
        totalHuShu = this.calcListScore(list,true,true,0);
        nowPlayer.currFightHuShu = totalHuShu.total ;
        nowPlayer.currEachHuList = totalHuShu.each;
        return {player:nowPlayer,list:list};
    }
    for(var i = 0;i < userList.length;i ++) {
        if(userList[i].uid != currPlayer.rightPlayer && userList[i].uid != currPlayer.uid) {
            nowPlayer =userList[i];
        }
    }
    list =  this.isSLWKan(nowPlayer.handCardList);
    if(!! list) {
        totalHuShu = this.calcListScore(list,true,true,0);
        nowPlayer.currFightHuShu = totalHuShu.total ;
        nowPlayer.currEachHuList = totalHuShu.each;
        return {player:nowPlayer,list:list};
    }
}


//判断是否三龙五坎
module.exports.isSLWKan = function(cardList) {
    var repeatObj = {};
    var cardId;
    var i = 0;
    for (i = 0; i < cardList.length; i++) {
        cardId = cardList[i];
        if (!repeatObj.hasOwnProperty(cardId)) {
            repeatObj[cardId] = 0;
        }
        repeatObj[cardId]++;
    }
    var slArr = [];
    var wkArr = [];
    var other = [];
    var tempCardId;
    for (var prop in repeatObj) {
        tempCardId = parseInt(prop);
        switch (repeatObj[prop]) {
            case 1:
                other.push(tempCardId);
                break;
            case 2:
                other.push(tempCardId);
                other.push(tempCardId);
                break;
            case 3:
                wkArr.push(tempCardId);
                break;
            case 4:
                slArr.push(tempCardId);
                break;
            default:
                break;
        }
    }
    var hu = false;
    if (slArr.length >= 3) {
        //三龙
        hu = true;
    }
    if (wkArr.length >= 5) {
        //五坎
        hu = true;
    }
    if(hu) {
        var totalList = [];
        for(i = 0;i < slArr.length;i ++) {
            totalList.push([slArr[i],slArr[i],slArr[i],slArr[i]]);
        }
        for(i = 0;i < wkArr.length;i ++) {
            totalList.push([wkArr[i],wkArr[i],wkArr[i]]);
        }
        var arrList = [];
        var nowList = this.calcListReturn(other,0,arrList);
        totalList = totalList.concat(nowList);
        return totalList;
    }
    return null;
}


//计算一个序列的胡数如[[1,2,3],[1,2,3]],是不是轮到这个玩家，是否自动摸牌，当前牌是
module.exports.calcListScore = function(cardList,mine,Auto,cardId) {
    var childArr;
    var nowHuShu = 0;
    var totalHuShu = 0;
    var huShuArr = [];
    for(var i = 0;i < cardList.length;i ++) {
        childArr = cardList[i];
        nowHuShu = this.getHandHuShu(cardList[i],(mine && Auto),cardId);
        huShuArr.push(nowHuShu);
        totalHuShu += nowHuShu;
    }
    return {total:totalHuShu,each:huShuArr};
}


//计算牌中是否是有顺子并且返回顺子序列
module.exports.calcListReturn = function(cardList,duiNum,overList) {
    var remainList = cardList.slice(0);
    var listOverList = overList.slice(0);
    var cardId = remainList.shift();
    var matchList = this.checkChi(cardId,remainList);
    var childArr;
    var childList;
    var canHu;
    var tempOverList;
    var startIdListIndex;
    var currListOverLength = listOverList.length;
    if( !! matchList ) {
        for (var i = 0; i < matchList.length; i++) {
            childArr = matchList[i];
            tempOverList = [];
            listOverList= listOverList.slice(0,currListOverLength);
            childArr.sort(ArrayUtil.sortNumber);
            childList = remainList.slice(0);
            for (var j = 0; j < childArr.length; j++) {
                tempOverList.push(childList[childArr[j]-j]);
                childList.splice(childArr[j] - j, 1);
            }
            tempOverList.push(cardId);
            listOverList.push(tempOverList);
            if (childList.length == 0) {
                return listOverList;
            } else if(childList.length < 3) {
                if(childList.length ==2 && duiNum > 0 && childList[0] == childList[1])
                {
                    listOverList.push([childList[0], childList[1]]);
                    return listOverList;
                } else {
                    return listOverList;
                }
            } else {
                canHu = this.calcListReturn(childList,duiNum,listOverList);
                if(canHu) {
                    return canHu;
                }
            }
        }
    }
}
//是否有龙且两个，用来开局补牌的
module.exports.haveTwoLong = function(cardList) {
    var repeatObj = {};
    var cardId;
    var i = 0;
    for (i = 0; i < cardList.length; i++) {
        cardId = cardList[i];
        if (!repeatObj.hasOwnProperty(cardId)) {
            repeatObj[cardId] = 0;
        }
        repeatObj[cardId]++;
    }
    var slNum = 0;
    for (var prop in repeatObj) {
        if(repeatObj[prop] == 4) {
            slNum ++;
        }
    }
    if(slNum ==2) {
        return true;
    }
    return false;
}

//判断玩家是否有扫的牌面上开招和碰牌面上的开招
//返回1扫，2碰
module.exports.haveOutKaiZhao = function(player,cardId) {
    var matchList
    for(var h = 0;h < player.shaoList.length;h ++) {
        matchList = this.checkKaizhao(cardId,player.shaoList[h]);
        if(!! matchList) {
            return 1;
        }
    }
    for(var m = 0;m < player.pengList.length;m ++) {
        matchList = this.checkKaizhao(cardId,player.pengList[m]);
        if(!! matchList) {
            return 2;
        }
    }
    return 0;
}

//计算有多少醒
//翻出的哪张牌，玩家所有的牌  上 中  下醒   1为上，2为中，3为下   大 为 上醒  ，小为下醒
module.exports.calcXing = function(cardId,cardIdList,xingArray) {
    if(! xingArray || xingArray.length == 0) {
        return 0;
    }
    var upNum = 0;
    var midNum = 0;
    var downNum = 0;
    var upBool = (xingArray.indexOf(1) != -1 || xingArray.indexOf("1") != -1);
    var midBool = (xingArray.indexOf(2) != -1 || xingArray.indexOf("2") != -1);
    var downBool = (xingArray.indexOf(3) != -1 || xingArray.indexOf("3") != -1);
    for(var i = 0;i < cardIdList.length;i ++) {
        if(upBool) {
            if(cardId == 20) {
                if(cardIdList[i] == 11) {
                    upNum ++;
                }
            } else if(cardId == 10) {
                if(cardIdList[i] == 1) {
                    upNum ++;
                }
            } else {
                if(cardIdList[i] == cardId + 1) {
                    upNum ++;
                }
            }
        }
        if(midBool) {
            if(cardId == cardIdList[i]) {
                midNum ++;
            }
        }
        if(downBool) {
            if(cardId == 1) {
                if(cardIdList[i] == 10) {
                    downNum ++;
                }
            } else if(cardId == 11) {
                if(cardIdList[i] == 20) {
                    downNum ++;
                }
            } else {
                if(cardIdList[i] == cardId - 1) {
                    downNum ++;
                }
            }
        }
    }
    var needNext = 0;
    if(upNum >= 4 || midNum >=4 || downNum >= 4) {
        needNext= 1;
    }
    return {needNext:needNext,xing:(upNum + midNum + downNum)};
}


//计算该玩家在扫穿完和扫完 是否可以胡  因为比较特殊，没有指引牌，直接判断手牌
//minHu 最低的起胡数,currPlayer,当前计算的玩家，cardId当前进来的牌可不可以胡
module.exports.calcSpliceHu = function(minHu,player,cardId,chuanType) {

    var currHu = player.rate;
    var cardList = player.handCardList.slice(0);
    var isKaiZhao = player.isKaiZhao;
    var i = 0;
    for(i = 0;i < cardList.length;i ++) {
        if(cardList[i] == cardId) {
            cardList.splice(i,1);
            i --;
        }
    }
    var repeatObj = {};
    var aloneArr = [];
    var overList = [];
    if(chuanType > 0) {
        isKaiZhao = true;
        if(chuanType != 10) {
             overList.push([cardId,cardId,cardId,cardId]);
        }
    }
    else {
        overList.push([cardId,cardId,cardId]);
    }
    var tempCardId;
    for (i = 0; i < cardList.length; i++) {
        tempCardId = cardList[i];
        if(!repeatObj.hasOwnProperty(tempCardId)) {
            repeatObj[tempCardId] = 0;
        }
        repeatObj[tempCardId] ++;
    }
    var tempCardId;
    for(var prop in repeatObj) {
        tempCardId = parseInt(prop);
        switch (repeatObj[prop] ) {
            case 1:
                aloneArr.push(tempCardId);
                break;
            case 2:
                aloneArr.push(tempCardId);
                aloneArr.push(tempCardId);
                break;
            case 3:
                overList.push([tempCardId,tempCardId,tempCardId]);
                break;
            case 4:
                if(! isKaiZhao)
                {
                    isKaiZhao = true;
                }
                overList.push([tempCardId, tempCardId, tempCardId, tempCardId]);
                break;
            default:
                break;
        }
    }
    var huBool;
    aloneArr.sort(ArrayUtil.sortNumber);
    if(isKaiZhao) {
        //判断3n+2
        huBool = this.calcHuPengFun(aloneArr,1,overList,cardId);
    }
    else {
        //判断3n
        huBool = this.calcHuPengFun(aloneArr,0,overList,cardId);
    }
    if(!! huBool) {
        var totalHuShu = this.calcListScore(huBool,true,true,cardId);
        //判断胡数是否足够
        if((totalHuShu.total + currHu) >= minHu) {
            player.currFightHuShu = (totalHuShu.total + currHu);
            player.currEachHuList = totalHuShu.each;
            return huBool;
        }
    }
    return null;
}