var app = require('http').createServer()
	, io = require('socket.io').listen(app);

app.listen(3000);

/**
 * @TODO
 * 1. Leave and Error
 * 2. Config debug|product mode
 * 3. Use module `cluster`
 */
io.sockets.on('connection', function(socket){

	socket.on('join', function(data){
		socket.join(data.roomName);
	});

	socket.on('leave', function(roomName){
		socket.leave(roomName);
	});

	socket.on('broadcast', function(data){
		socket.broadcast.to(data.roomName).emit(data.event, data);
	});

	socket.on('error', function(){
		socket.emit();
	});

	socket.on('getClients', function(roomName, callback){
		var clientIds = new Array();
		var roomSockets = io.sockets.clients(roomName);
		for (var i = roomSockets.length - 1; i >= 0; i--) {
			clientIds.push(roomSockets[i].id);
		};
		callback({client_ids: clientIds});
	});
});
