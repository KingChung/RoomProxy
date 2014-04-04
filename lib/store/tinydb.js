var _ = require('underscore');
var iface = require('../interface');

var Database = (function(){
	var _collection = {};

	var Collection = function(){
		this._document = {};
	}

	Collection.prototype.save = function(key, value){
		this._document[key] = value;
	}

	Collection.prototype.find = function(key){
		return this._document[key];
	}

	var Db = function(){};

	Db.prototype.getCollection = function(cName){
		if( ! (_collection[cName] instanceof Collection)) {
			_collection[cName] = new Collection();
		}
		return _collection[cName];
	}

    Db.prototype.getCollections = function(){
        return _collection;
    }

	return Db;
})();

module.exports =  function(settings){
	var database = new Database();
    return _.extend(iface, {
        updateClientIdWithUserId: function(clientId, userId){
        	var args = Array.prototype.slice.call(arguments, -1);
        	var collection = database.getCollection(userId);
        	var clientIds = collection.find('client_ids') || [];
        	clientIds.push(clientId);
        	collection.save('client_ids', clientIds);

        	if("function" === typeof args[0]) {
        		args[0](null);
        	}
        },
        removeClientIdWithUserId: function(clientId, userId){
            var args = Array.prototype.slice.call(arguments, -1);
        	var collection = database.getCollection(userId);
        	var clientIds = collection.find('client_ids') || [];
        	clientIds = _.filter(clientIds, function(id){
        		return id !== clientId;
        	});
        	collection.save('client_ids', clientIds);
        	if("function" === typeof args[0]) {
        		args[0](null);
        	}  
        },
        findClientIdsByUserId: function(userId, callback){
        	var args = Array.prototype.slice.call(arguments, -1);
        	var collection = database.getCollection(userId);
        	var clientIds = collection.find('client_ids') || [];
        	
        	if("function" === typeof args[0]) {
        		args[0](null, clientIds);
        	} 

            if('function' != typeof callback)
                throw new Error('Callback is not a function');
        },
        saveDataWithUserId: function(key, value, userId){
        	var collection = database.getCollection(userId);
        	return collection.save(key, value);
        },
        findDataByUserId: function(userId, key){
        	var collection = database.getCollection(userId);
        	return collection.find(key);
        }
    });
};