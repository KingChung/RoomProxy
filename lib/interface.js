notImplement = function() {
    throw new Error('Please implement the store interface');
}

module.exports = {
    updateClientIdWithUserId: function(clientId, userId){
        notImplement();
    },
    removeClientIdWithUserId: function(clientId, userId){
        notImplement();
    },
    //
    // callback: function(err, doc.client_ids) {
    // 
    // }
    //
    findClientIdsByUserId: function(userId, callback){
        notImplement();
    },
}