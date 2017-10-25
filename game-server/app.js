var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
var httpPlugin = require('pomelo-http-plugin');
var WXPay = require('./app/util/weixin/wxpay');
var numUtil = require('./app/util/numUtil');
var app = pomelo.createApp();
app.set('name', 'zipai-server');

app.loadConfig('mysql', app.getBase() + '/config/mysql.json');
app.loadConfig('httpConfig',  app.getBase() + '/config/http.json');
app.loadConfig('formalAccount',  app.getBase() + '/config/formalAccount.json');
// app configuration
app.configure('production|development', 'connector', function(){
    app.set('connectorConfig',{
        connector : pomelo.connectors.hybridconnector,
        heartbeat : 60,
        //请求计算10秒还没回调 就timeout
        timeout: 10000,
        //字典压缩 protobuf中的key
        useDict : true,
        //protobuf压缩
        useProtobuf : true
    });

});

app.configure('production|development', 'gate', function(){
    app.set('connectorConfig', {
        connector : pomelo.connectors.hybridconnector,
        //因为通常是回调。不需要被请求和消息
        useProtobuf : true
    });
});

app.configure('production|development', function() {
    var dbclient = require('./app/dao/mysql/mysql').init(app);
    app.set('dbclient', dbclient);
   // app.route('fight', routeUtil.fight);//被踢下线原因注释
    app.route('connector', routeUtil.connector);
    app.filter(pomelo.timeout());
    app.enable('systemMonitor');
    if(app.serverType !== 'master'){
        var fightList = app.get("servers").fight;
        var fightMap = {};
        for(var id in fightList){
            fightMap[fightList[id].fight] = fightList[id].id;
        }
        app.set('fightMap',fightMap);
    }
});

app.configure('development', 'gamehttp', function() {
    console.log("################ gamehttp##############" + JSON.stringify( app.get('httpConfig') ) )
    app.use(httpPlugin, {http: app.get('httpConfig')[app.getServerId()]});
});


app.start();


process.on('uncaughtException', function(err) {
    console.error(' Caught exception: ' + err.stack);
});

