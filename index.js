var app = require('http').createServer()
	, io = require('socket.io').listen(app)
	, fs = require('fs')
	, store = require('./lib/store');

app.listen(8080);

/**
 * Server library
 */
var fileCache = {};
app.on('request', function(req, res){
	if('GET' === req.method && req.url.split('?')[0] === '/roomproxy.js')
	{
		var clientPath = '/lib/client/roomproxy.js';
		if(fileCache.hasOwnProperty(clientPath))
		{
			res.writeHead(200, {'Content-Type': 'text/javascript'});
			res.write(fileCache[clientPath]);
			res.end();
		}
		else
		{
			fs.readFile(__dirname + clientPath, function(err, data){
				var text = data.toString();
				res.writeHead(200, {'Content-Type': 'text/javascript'});
				res.write(text);
				res.end();
			});
		}
	}
});

var Utils = {
	findClientByUserId: function(userId, callback){
		return callback(socket);
	}
}

/**
 * @TODO
 * 1. Leave and Error
 * 2. Config debug|product mode
 * 3. Use module `cluster`
 */
io.sockets.on('connection', function(socket){

	var clientId = socket.id;
	/**
	 * Login
	 * @param  Object profile Ex. {id: 'xxx', profile: {name: 'yyy', number: ''}}
	 */
	socket.on('login', function(profile){
		store.updateClientIdWithUserId(clientId, profile.id);
	});

	socket.on('join', function(roomName, userIds){
		socket.join(roomName);

		if(userIds instanceof Array && 0 < userIds.length)
		{
			//@TODO Get client by userId
			var clientIds = [];
			for (var i in userIds) {
				Utils.findClientByUserId(userIds, function(socket){
					socket.join(roomName);
				});
			};
		}
	});

	socket.on('leave', function(roomName){
		socket.leave(roomName);
	});

	socket.on('broadcast', function(data){
		socket.broadcast.to(data.roomName).emit(data.event, data);
	});

	socket.on('getClients', function(roomName, callback){
		var clientIds = new Array();
		var roomSockets = io.sockets.clients(roomName);
		for (var i = roomSockets.length - 1; i >= 0; i--) {
			clientIds.push(roomSockets[i].id);
		};
		callback({client_ids: clientIds});
	});

	socket.on('disconnect', function () {
		var rooms = io.sockets.manager.roomClients[socket.id];
		for(var i in rooms)
			socket.leave(i.slice(1));
	});
});