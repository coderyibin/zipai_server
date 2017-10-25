/**
 * Created by xieyq on 2017/3/24.
 */
var exp = module.exports;
var dispatcher = require('./dispatcher');
exp.fight = function(session, msg, app, cb) {

    var fightServers = app.getServersByType('fight');
    if(!fightServers || fightServers.length === 0) {
        cb(new Error('can not find chat servers.'));
        return;
    }

    var serverId = 0;
    if(! session.get("serverId")){
        var res = dispatcher.dispatch(session.uid, fightServers);
        serverId = res.id;
    } else {
        serverId = session.get('serverId');
        if(!serverId) {
            cb(new Error('can not find server info for type: ' + msg.serverType));
            return;
        }
    }

    cb(null, serverId);
};

exp.connector = function(session, msg, app, cb) {
    console.log("routeUtil/connector" + session.frontendId);
    if(!session) {
        cb(new Error('fail to route to connector server for session is empty'));
        return;
    }

    if(!session.frontendId) {
        cb(new Error('fail to find frontend id in session'));
        return;
    }
    cb(null, session.frontendId);
};