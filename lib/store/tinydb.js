var _ = require('underscore');
var iface = require('../interface');

var Database = (function(){
	var _collection = {};

	var Collection = function(){
		this._docs = [];
	}

	Collection.prototype.save = function(values){
		this._docs.push(values);
	}

    Collection.prototype.update = function(condition, values){
        var that = this;
        var doc = _.findWhere(this._docs, condition);
        if(undefined !== doc) {
            doc = _.extend(doc, values);
        }
    }

    Collection.prototype.findOne = function(condition){
        return _.findWhere(this._docs, condition);
    }

    Collection.prototype.findAll = function(){
        return this._docs;
    }

    Collection.prototype.remove = function(condition){
        this._docs = _.without(this._docs, _.findWhere(this._docs, condition));
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
    var collection = database.getCollection('user');
    return _.extend(iface, {
        updateClientIdWithUserId: function(clientId, userId){
        	var args = Array.prototype.slice.call(arguments, -1);
            var doc = collection.findOne({user_id: userId});
            console.log(userId, doc);
            if(undefined !== doc) {
                var clientIds = Array.isArray(doc.client_ids) ? doc.client_ids : [];
                clientIds.push(clientId);
                collection.update({user_id: userId}, {client_ids: clientIds});
            } else {
                collection.save({user_id: userId, client_ids: [clientId]});
            }
        	if("function" === typeof args[0]) {
        		args[0](null);
        	}
        },
        removeClientIdWithUserId: function(clientId, userId){
            var args = Array.prototype.slice.call(arguments, -1);
            var doc = collection.findOne({user_id: userId});
            if(undefined !== doc && Array.isArray(doc.client_ids)) {
                var clientIds = _.without(doc.client_ids, clientId);
                collection.update({user_id: userId}, {client_ids: clientIds});
            }

        	if("function" === typeof args[0]) {
        		args[0](null);
        	}  
        },
        findClientIdsByUserId: function(userId, callback){
        	var args = Array.prototype.slice.call(arguments, -1);
            var doc = collection.findOne({user_id: userId});
        	if("function" === typeof args[0] && undefined !== doc) {
        		args[0](null, doc.client_ids);
        	}

            if('function' != typeof callback)
                throw new Error('Callback is not a function');
        },
        saveDataWithUserId: function(key, value, userId){
            var values = {};
            values[key] = value;
            console.log(key, value);
            return collection.update({user_id: userId}, values);
        },
        findDataByUserId: function(userId){
            return collection.findOne({user_id: userId});
        },
        removeDataByUserId: function(userId){
            collection.remove({user_id: userId});
        }
    });
};