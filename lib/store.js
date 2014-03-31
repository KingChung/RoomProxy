var _ = require('underscore')
	, config = require('../config')
	, storeConfig = config.store;
if('' == storeConfig.lib)
	 throw new Error('Store library does not confingure.'); 

var db = require(storeConfig.lib);

module.exports = function(settings){

	settings = _.extend(storeConfig, settings || {});
	var connection = settings.host + settings.database
		, collection = settings.collection;
	db = db.connect(connection, [collection]);

	return {
		updateClientIdWithUserId: function(clientId, userId){
			var args = Array.prototype.slice.call(arguments, -1)
				, cb = ("function" == typeof args[0]) ? args[0] : function(){};

			db[collection].findOne({user_id: userId}, {}, function(err, doc){
				if(err)
					return cb(err);

				db[collection].update({user_id: userId}, {
					$addToSet: {
						"client_ids": clientId
					}
				}, {upsert: true}, function(err){
					cb(err);
				});
			});
		},
		removeClientIdWithUserId: function(clientId, userId){
			var args = Array.prototype.slice.call(arguments, -1)
				, cb = ("function" == typeof args[0]) ? args[0] : function(){};

			db[collection].findOne({user_id: userId}, {
				"_id": true,
				"client_ids": true
			}, function(err, doc){
				if(err) {
					return cb(err);
				} else if(doc) {
					db[collection].update({'_id':doc._id}, {
			            $set:{
			            	'client_ids':_.without(doc.client_ids, clientId)
			            }
			        }, function(err){
			        	cb(err);
			        });
				} else {
					cb(null);
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
			db[collection].remove();
		}
	}
};