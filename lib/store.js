var _ = require('underscore')
	, config = require('../config')
	, storeConfig = config.store;
if('' == storeConfig.lib)
	 throw new Error('Store library does not confingure.'); 

var db = require(storeConfig.lib).connect(storeConfig.server.db, storeConfig.collections);
var self = module.exports = {};

var CHAT_STATUS_ONLINE = 'online'
	, CHAT_STATUS_OFFLINE = 'offline'
	, CHAT_STATUS_NOT_DISTURB = 'not_disturb';

self.updateClientIdWithUserId = function(clientId, userId){
	var args = Array.prototype.slice.call(arguments, 2)
		, cb = ("function" == typeof args[0]) ? args[0] : function(){};

	db.chat_user.findOne({user_id: userId}, {}, function(err, doc){
		if(err)
			return cb(err);

		db.chat_user.update({user_id: userId}, {
			$addToSet: {
				"client_ids": clientId
			}
		}, {upsert: true}, function(err){
			cb(err);
		});
	});
}

self.removeClientIdWithUserId = function(clientId, userId){
	var args = Array.prototype.slice.call(arguments, 2)
		, cb = ("function" == typeof args[0]) ? args[0] : function(){};

	db.chat_user.findOne({user_id: userId}, {
		"_id": true,
		"client_ids": true
	}, function(err, doc){
		if(err)
			return cb(err);
		
        db.chat_user.update({'_id':doc._id}, {
            $set:{
            	'client_ids':_.without(doc.client_ids, clientId)
            }
        }, function(err){
        	cb(err);
        });
	});
}

self.findClientIdsByUserId = function(userId, callback){
	if('function' != typeof callback)
		throw new Error('Callback is not a function');
	db.chat_user.findOne({user_id: userId}, {
		client_ids: true
	}, function(err, doc){
		callback(err, doc.client_ids);
	});
}