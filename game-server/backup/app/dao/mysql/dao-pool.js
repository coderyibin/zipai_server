var mysql = require('mysql');

/*
 * Create mysql connection pool.
 */

var createMysqlPool = function(app) {
	var mysqlConfig = app.get('mysql');

	return mysql.createPool({
        host : mysqlConfig.host,
        user : mysqlConfig.user,
        password : mysqlConfig.password,
        database : mysqlConfig.database,
        port : mysqlConfig.port,
        connectionLimit : 10,
        supportBigNumbers: true
    });
};

exports.createMysqlPool = createMysqlPool;
