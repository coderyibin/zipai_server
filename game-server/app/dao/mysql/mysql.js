// mysql CRUD
var logger = require('pomelo-logger').getLogger('guilin', __filename);

var sqlclient = module.exports;

var _pool;

var NND = {};

/*
 * Init sql connection pool
 * @param {Object} app The app for the server.
 */
NND.init = function(app){
	_pool = require('./dao-pool').createMysqlPool(app);
};

/**
 * Excute sql statement
 * @param {String} sql Statement The sql need to excute.
 * @param {Object} args The args for the sql.
 * @param {fuction} cb Callback function.
 * 
 */
NND.query = function(sql, args, cb){
	_pool.getConnection(function(err, client) {
		if (!!err) {
			logger.error('[sqlqueryErr] '+ err.stack);
			return;
		}

		client.query(sql, args, function(err, res) {
			client.release();
			cb(err, res);
		});
	});
};

NND.begin = function(cb){
    _pool.getConnection(function(err, client) {
        if (!!err) {
            logger.error('[sqlqueryErr] '+err.stack);
            cb(err, null);
            return;
        }

        client.beginTransaction(function(err) {
            if (err) {
                if (typeof cb === "function") {
                    cb(err, null);
                }

                client.release();
                return;
            }

            if (typeof cb === "function") {
                cb(null, client);
            }
        });
    });
};

NND.commit = function(client, cb){
    client.commit(function(err) {
        var info = null;
        if (err) {
            info = err;
        }

        if (typeof cb === "function") {
            cb(info, null);
        }

        client.release();
    });
};

NND.rollback = function(client, cb){
    client.rollback(function(err) {
        var info = null;
        if (err) {
            info = err;
        }

        if (typeof cb === "function") {
            cb(info, null);
        }

        client.release();
    });
};

/**
 * Close connection pool.
 */
NND.shutdown = function(){
	_pool.end();
};

/**
 * init database
 */
sqlclient.init = function(app) {
	if (!!_pool){
		return sqlclient;
	} else {
		NND.init(app);
		sqlclient.insert = NND.query;
		sqlclient.update = NND.query;
		sqlclient.delete = NND.query;
		sqlclient.query = NND.query;

        sqlclient.begin = NND.begin;
        sqlclient.commit = NND.commit;
        sqlclient.rollback = NND.rollback;
		return sqlclient;
	}
};

/**
 * shutdown database
 */
sqlclient.shutdown = function(app) {
	NND.shutdown(app);
};
