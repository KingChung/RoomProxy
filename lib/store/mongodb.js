var _ = require('underscore');
var iface = require('../interface');

validateFn = function(settings) {
    if( ! settings.url) {
        // throw
        return false;
    }

    if( ! settings.collection) {
        // throw
        return false;
    }

    return true;
}

// settings = {
//     "url": "<connection url>", //Example: 127.0.0.1/testcn10
//     "collection": "<collection name>" // the collection to store the chat user information, Example: chat_user_room_proxy
// };
module.exports =  function(settings){
    if( ! validateFn(settings)) {
        // throw
        return false;
    }

    var collectionName = settings.collection;
    var db = require('mongojs').connect(settings.url, [collectionName]);
    var collection = db[collectionName];

    var initDatabase = function() {
        db.createCollection(collectionName, {}, function(err){
            if(err) {
                console.error(err);
                throw new Error('Cannot create collection - '+collectionName);
            }                   

            collection.ensureIndex({"user_id": 1}, {
                "unique": true,
                "dropDups": true
            });
        });
    };

    var resetDatabase = function(removeOld) {
        if(removeOld) {
            collection.drop(function(err){
                if(err) {
                    console.error(err)
                    throw new Error('Cannot remove collection - '+collectionName);
                }

                initDatabase();
            });
        } else {
            initDatabase();
        }
    };

    //@todo put it to other place is better 
    // ResetDatabase when init.
    resetDatabase(true);

    return _.extend(iface, {
        updateClientIdWithUserId: function(clientId, userId){
            var args = Array.prototype.slice.call(arguments, -1)
                , cb = ("function" == typeof args[0]) ? args[0] : function(){};

            collection.update({user_id: userId}, {
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

            collection.update({user_id: userId}, {
                "$pull": {"client_ids":clientId}
            }, {
                "upsert": false
            }, function(err){
                cb(err)
            });
        },
        findClientIdsByUserId: function(userId, callback){
            if('function' != typeof callback)
                throw new Error('Callback is not a function');

            collection.findOne({user_id: userId}, {
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
        }
    });
}; 