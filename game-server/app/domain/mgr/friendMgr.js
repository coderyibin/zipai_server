/**
 * Created by xieyq on 2017/7/6.
 */
var exp = module.exports;

var inviteDic = {};

// 邀请人  被邀请人
exp.addInviteData = function(userId,friendId){
    inviteDic[userId + "_" + friendId] = friendId;
}

// 邀请人  被邀请人
exp.getInviteData = function (userId,friendId){
    if(inviteDic[userId + "_" + friendId]){
        return 1;
    } else {
        return 0;
    }
}

exp.delInviteData = function (userId,friendId){
    delete inviteDic[userId + "_" + friendId];
}

exp.delInviteDataFromFId = function (friendId){
    console.log("friendMgr/delInviteDataFromFId" + friendId);
    for(var prop in inviteDic){
        console.log("friendMgr/delInviteDataFromFId data" + inviteDic[prop]);
        if(inviteDic[prop] == friendId){
            delete inviteDic[prop];
        }
    }
}
