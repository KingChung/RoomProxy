module.exports = function(settings){

    //@todo, now we only support mongodb, later we can support redis or some other db else.
    switch (settings.type) {
    	case "mongodb":
    		return require('./store/mongodb')(settings);
    		break;
    	case "memory":
    		return require('./store/memory')(settings);
    		break;
    }

    throw new Error('Undefined store settings');
};