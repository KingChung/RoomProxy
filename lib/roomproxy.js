var io = require('socket.io')
	, _ = require('underscore')
	// , yui = require('yui-compressor')
	// , helper = require('./helper')
	, fs = require('fs')
	, domain = require('domain');

// {
//    "disable_compression": false, // default to enable gzip
// 	  "store": {
// 		  "type": "" // we only support mongodb now.
// 		  "...", // different type of store has different keys/values
// 	  }
// }
// 
exports = module.exports = function(settings) {
	settings = settings || {};

	//@todo check store has been inited or not.
	var store = require('./store')(settings.store);
	var httpServer = require('http').createServer().listen(settings.port || 8080);
	var ioSettings = settings.socketio || {};
	if(settings.debug) {
		_.extend(ioSettings, {
			"log level": 3
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

	/**
	 * Server library
	 */
	var generateClientConfigures = function(req){
		return "(ROOMPROXY_CONFIG = {io: {client: 'http://" + req.headers.host + "', lib: 'http://" + req.headers.host + "/socket.io/socket.io.js'}});\n";
	}

	var fileCache = {};
	var defaultListeners = httpServer.listeners('request');
	httpServer.removeAllListeners('request');
	httpServer.on('request', function(req, res) {
		var reqd = domain.create();
		reqd.add(req);
		reqd.add(res);
		reqd.on('error', function(errors){
			console.log('Server File Error', errors.code);
		});

 		if('GET' === req.method && req.url.split('?')[0] === '/roomproxy.js') {
	 		var clientPath = '/client/roomproxy.js';
	 		if(fileCache.hasOwnProperty(clientPath)) {
	 			res.writeHead(200, fileCache[clientPath].headers);
	 			res.write(fileCache[clientPath].text);
	 			res.end();
	 		} else {
	 			fs.readFile(__dirname + clientPath, function(err, data){
	 				var text = generateClientConfigures(req) + data.toString();
	 				var headers = {
 						'Content-Type': 'text/javascript', 
						'Content-Length': text.length,
 					};

 					res.writeHead(200, headers);
 					res.write(text);

	 				// Cache it in memory, then improve the IO performance.
	 				fileCache[clientPath] = {
	 					headers: headers,
	 					text: text
	 				};

	 				res.end();

	 				// we disable yui and gzip now
	 				// yui.compile(text, function(err, text){
	 				// 	if( ! settings.disable_compression) {
	 				// 		helper.gzip(text, function(err, text){
		 			// 			var headers = {
			 		// 				'Content-Type': 'text/javascript', 
			 		// 				'Content-Encoding': 'gzip',
						// 			'Content-Length': text.length,
			 		// 			};

			 		// 			res.writeHead(200, headers);
			 		// 			res.write(text);

				 	// 			// Cache it in memory, then improve the IO performance.
				 	// 			fileCache[clientPath] = {
				 	// 				headers: headers,
				 	// 				text: text
				 	// 			};

				 	// 			res.end();
			 		// 		});
	 				// 	} else {
	 				// 		var headers = {
		 			// 			'Content-Type': 'text/javascript', 
						// 		'Content-Length': text.length,
		 			// 		};

		 			// 		res.writeHead(200, headers);
		 			// 		res.write(text);

			 		// 		// Cache it in memory, then improve the IO performance.
			 		// 		fileCache[clientPath] = {
			 		// 			headers: headers,
			 		// 			text: text
			 		// 		};

			 		// 		res.end();
	 				// 	}
	 					
	 				// });
	 			});
	 		}
	 	} else {
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

			//@TODO Pick others join to the room
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

		/**
		 * Store data
		 * @param  String 					key      
		 * @param  Object|String|Function 	[value|callback]
		 *
		 * Ex.
		 * 1. store(key, value)		Stores a value for a given key;
		 * 2. store(key, callback)	Gets a stored value based on the key and return the 
		 * 							data use callback;	
		 */
		socket.on('store', function(key){
			if( ! key) {
				console.warn('Key is invalid.');
				return;
			}

			var args = [].slice.call(arguments, -1);
			socket.get('user_id', function(err, userId){
				if(err) {
					console.warn('Can not find doc by id.');
				} else {
					if("function" === typeof args[0]) {
						args[0](store.findDataByUserId(userId, key));
					} else {
						store.saveDataWithUserId(key, args[0], userId);
					}
				}
		 	});
		});
	});

	//@TODO Mini client for server to use
	return {
		getRoom: function(roomName){
			return {
				emit: function(event, data){
					io.sockets.in(roomName).emit(roomName + event, data)
				}
			}
		},
		getProxy: function(){
			return io;
		}
	}
}