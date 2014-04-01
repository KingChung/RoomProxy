var _ = require('underscore');
var iface = require('../interface');

// {
//     "<user id1>": ["client_id1", "client_id2", ...],
//     "<user id2>": ["client_id1", "client_id2", ...],
//     ...
// }
var memoryDb = {
    _db: {},
    get: function(userId) {
        if(this._db[userId]) {
            return this._db[userId];
        }

        return [];
    },
    set: function(userId, clientIds) {
        this._db[userId] = clientIds;
    },
    add: function(userId, clientId) {
        var clientIds = this.get(userId);
        clientIds.push(clientId);
        this.set(userId, clientIds);
    },
    remove: function(userId, clientId) {
        var clientIds = this.get(userId);
        for(var i in clientIds) {
            if(clientIds[i] === clientId) {
                clientIds.splice(i, 1);
                this.set(userId, clientIds);
                return;
            }
        }
    }
};

// settings = {
// 
// };
module.exports =  function(settings){
    return _.extend(iface, {
        updateClientIdWithUserId: function(clientId, userId){
            var args = Array.prototype.slice.call(arguments, -1)
                , cb = ("function" == typeof args[0]) ? args[0] : function(){};

            memoryDb.add(userId, clientId);
            cb(null);
        },
        removeClientIdWithUserId: function(clientId, userId){
            var args = Array.prototype.slice.call(arguments, -1)
                , cb = ("function" == typeof args[0]) ? args[0] : function(){};

            memoryDb.remove(userId, clientId);
            cb(null);  
        },
        findClientIdsByUserId: function(userId, callback){
            if('function' != typeof callback)
                throw new Error('Callback is not a function');

            callback(null, memoryDb.get(userId));
        }
    });
}; 