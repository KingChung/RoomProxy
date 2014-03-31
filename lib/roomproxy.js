var io = require('socket.io')
	, _ = require('underscore')
	, fs = require('fs')
	, config = require('../config');

exports = module.exports = function(settings){
	settings = settings || {};

	var httpServer = null;
	if( ! httpServer)
	{
		httpServer = require('http').createServer();
		httpServer.listen(settings.port || 8080);
	}

	var ioSettings = settings.socketio;
	if(settings.debug) {
		_.extend(ioSettings, {
			"log level": 3,
			"transports": ['websocket']
		});
	}

	io = io.listen(httpServer, ioSettings);

	//Configure
	io.configure('production', function(){
		io.enable('browser client minification');  // send minified client
		io.enable('browser client etag');          // apply etag caching logic based on version number
		io.enable('browser client gzip');          // gzip the file

		io.set('log level', 1);

		io.set('transports', [
			'websocket'
			, 'flashsocket'
			, 'htmlfile'
			, 'xhr-polling'
			, 'jsonp-polling'
		]);
	});

	io.configure('development', function(){
		io.set('transports', ['websocket']);
	});

	store = require('./store')(settings.store);
	store.resetDatabase();

	/**
	 * Server library
	 */
	var generateClientConfigures = function(req){
		return "ROOMPROXY_CONFIG = {io: {client: 'http://" + req.headers.host + "', lib: 'http://" + req.headers.host + "/socket.io/socket.io.js'}}";
	}

	var fileCache = {};
	var defaultListeners = httpServer.listeners('request');
	httpServer.removeAllListeners('request');
	httpServer.on('request', function(req, res){
 		if('GET' === req.method && req.url.split('?')[0] === '/roomproxy.js')
	 	{
	 		var clientPath = '/client/roomproxy.js';
	 		if(fileCache.hasOwnProperty(clientPath))
	 		{
	 			res.writeHead(200, {'Content-Type': 'text/javascript'});
	 			res.write(generateClientConfigures(req));
	 			res.write(fileCache[clientPath]);
	 			res.end();
	 		}
	 		else
	 		{
	 			fs.readFile(__dirname + clientPath, function(err, data){
	 				var text = data.toString();
	 				res.writeHead(200, {'Content-Type': 'text/javascript'});
	 				res.write(generateClientConfigures(req));
	 				res.write(text);
	 				res.end();
	 			});
	 		}
	 	}
	 	else
	 	{
	 		for (var i in defaultListeners) {
	 			defaultListeners[i].call(httpServer, req, res);
	 		};
	 	}
	});

	/**
	 * @TODO
	 * 1. Leave and Error
	 * 2. Config debug|product mode
	 * 3. Use module `cluster`
	 */
	io.sockets.on('connection', function(socket){
	 	var clientId = socket.id;
		
		socket.on('login', function(userId){
		 	socket.set('user_id', userId, function(){
		 		store.updateClientIdWithUserId(clientId, userId, function(err){
		 			socket.on('disconnect', function(){
		 				store.removeClientIdWithUserId(clientId, userId);
		 			});

		 			socket.$emit('afterLogin', userId);
		 		});
		 	});
		});

		socket.on('join', function(roomName, userIds){
			//Self join to the room
			socket.join(roomName);

			//Pick others join to the room
			if(userIds instanceof Array && 0 < userIds.length)
			{
				for (var i in userIds) {
					store.findClientIdsByUserId(userIds[i], function(err, clientIds){
						if(err)
							console.warn('Can not find doc by userId.');

						for(var i in clientIds) {
							io.sockets.socket(clientIds[i]).emit('joined', {roomName: roomName});
						}
					});
				};
			}
		});

		socket.on('leave', function(roomName){
			socket.leave(roomName);
		});

		socket.on('broadcast', function(data){
		 	socket.get('user_id', function(err, userId){
		 		socket.broadcast.to(data.roomName).emit(data.event, {
		 			caller: {id: userId},
		 			data: data.data
		 		});
		 	});
		});

		socket.on('getClientUserIds', function(roomName, callback){
		 	var userIds = new Array();
		 	var roomSockets = io.sockets.clients(roomName);
		 	for (var i = roomSockets.length - 1; i >= 0; i--) {
		 		io.sockets.socket(roomSockets[i].id).get('user_id', function(err, userId){
		 			userIds.push(userId);
		 		});
		 	};
		 	callback({user_ids: userIds});
		});

		socket.on('disconnect', function(){
			var rooms = io.sockets.manager.roomClients[socket.id];
		 	for(var i in rooms) {
		 		var roomName = i.slice(1);
		 		if("" !== roomName) {
		 			socket.$emit('broadcast', {
			 			roomName: roomName,
			 			event: roomName + 'leave'
			 		});
		 		}
		 	}
		});

		//One to One handshake
		socket.on('handshake', function(id, data){
			socket.get('user_id', function(err, userId){
		 		store.findClientIdsByUserId(id, function(err, clientIds){
					if(err)
						console.warn('Can not find doc by id.');

					for(var i in clientIds)
					{
						io.sockets.socket(clientIds[i]).emit('handshake', {
							caller: {id: userId},
			 				data: data
						});
					}
				});
		 	});
		});

		//@TODO
		socket.on('getIsOnline', function(id, callback){
			store.findClientIdsByUserId(id, function(err, clientIds){
				if(err)
					console.warn('Can not find doc by id.');

				if('function' === typeof callback) {
					callback( !! (clientIds && clientIds.length));
				}
			});	
		});
	});

	return {
		getUsersInRoom: function(roomId){

		},
		getRoomsUserJoined: function(userId, callback){
			store.findClientIdsByUserId(userId, function(err, clientIds){
				if(err) {
					console.warn('Can not find doc by id.');
				}

				if(clientIds && _.isArray(clientIds)) {
					var clientId = clientIds.shift();
					if("function" === typeof callback) {
						var rooms = [];
						var roomClients = io.sockets.manager.roomClients[clientId];
						_.each(roomClients, function(room, roomName){
							rooms.push(roomName.slice(1));
						});
						callback(rooms);
					}
				}
			});
		},
		getProxy: function(){
			return io;
		}
	}
}