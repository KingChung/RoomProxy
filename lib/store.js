module.exports = function(settings){
    //@todo, now we only support mongodb, later we can support redis or some other db else.
    if("mongodb" == settings.type) {
        return require('./store/mongodb')(settings);
    }

    throw new Error('Undefined store settings');
};