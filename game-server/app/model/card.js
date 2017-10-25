/**
 * Created by xieyq on 2017/3/22.
 */
//总的80张牌
var Range = require('node-range');
var Shuffle = require('shuffle-array');
var Chunk = require('array.chunk');
var Rule = require('./rule');
var TotalCard = 80;
module.exports = function() {
    return new Card();
}

var Card = function() {
    this.cards = []; //所有的牌   [1-20] 1-10为小写。11-20为大写
    this.cardList = [];// 每人一份，总三份
    this.remainCard = [];//待摸牌
    this.postCard = []; //当前发掉的牌
}

//调试用的直接指定牌
Card.prototype.debugCard = function(debugCardList) {
    this.cardList = debugCardList.slice(0);
    this.remainCard  = this.cardList.pop().slice(0);
    return this.cardList;
}


//洗牌并发牌
Card.prototype.assignCard = function (roomId) {
    //创建字牌数组 80 张
    var arr = Range(1, TotalCard, true).toArray();
    for (var i = 0; i < arr.length; i++) {
        this.cards[i] = Rule.decodeCardId(arr[i]);
    }
    //洗牌打混
    Shuffle(this.cards);
    //  洗牌后拆分成四份，每人一份，待摸牌一份
    this.cardList = Chunk(this.cards, 20);
    //将最后一份牌变成待摸牌
    this.remainCard  = this.cardList.pop();
    return this.cardList;
}


