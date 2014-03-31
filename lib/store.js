var _ = require('underscore');

var defaultStoreConfig = {
	"lib": "mongojs",
	"host": "127.0.0.1",
	"database": "/testcn10",
	"collection": "chat_user_room_proxy"
}

module.exports = function(settings){
	settings = _.extend(defaultStoreConfig, settings || {});

	var db = require(settings.lib);
	var connection = settings.host + settings.database;
	var collection = settings.collection;

	db = db.connect(connection, [collection]);

	return {
		updateClientIdWithUserId: function(clientId, userId){
			var args = Array.prototype.slice.call(arguments, -1)
				, cb = ("function" == typeof args[0]) ? args[0] : function(){};

			db[collection].update({user_id: userId}, {
				$addToSet: {
					"client_ids": clientId
				}
			}, {upsert: true}, function(err){
				cb(err);
			});
		},
		removeClientIdWithUserId: function(clientId, userId){
			var args = Array.prototype.slice.call(arguments, -1)
				, cb = ("function" == typeof args[0]) ? args[0] : function(){};

			db[collection].update({user_id: userId}, {
				"$pull": {
					"client_ids": clientId
				}, {
					upsert: false
				}, function(err) {
					cb(err)
				}
			});
		},
		findClientIdsByUserId: function(userId, callback){
			if('function' != typeof callback)
				throw new Error('Callback is not a function');

			db[collection].findOne({user_id: userId}, {
				client_ids: true
			}, function(err, doc){
				if(err) {
					return callback(err);
				} else if(doc) {
					return callback(err, doc.client_ids);
				} else {
					return callback(null);
				}
			});
		},
		resetDatabase: function(){
			db[collection].remove(function(err){
				if(err) {
					throw new Error('Cannot remove collection - '+collection);
				}

				db.createCollection(collection, {}, function(err){
					if(err) {
						throw new Error('Cannot create collection - '+collection);
					}					

					db[collection].ensureIndex({"user_id": 1}, {
						"unique": true,
						"dropDups": true
					});
				});
			});
		}
	}
};