var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var httpServer = require('http').createServer(function(req, response){
	if (req.method === 'GET' && req.url.split('?')[0] === '/groupproxy.js')
	{
		fs.readFile(__dirname+'/lib/groupproxy.js', function(err, data){
			response.writeHead(200, {'Content-Type': 'text/javascript'});
			response.write(data);
			response.end();
		});
	}
}).listen(3000);

var nowjs = require("now");
var everyone = nowjs.initialize(httpServer);

var GLOBAL_ROOM_ID = 'CN_ROOM'; 

nowjs.on('connect', function(){
	this.now.globalRoomId = GLOBAL_ROOM_ID;
	nowjs.getGroup(GLOBAL_ROOM_ID).addUser(this.user.clientId);
});

nowjs.on('disconnect', function(){
		
});

everyone.now.joinRoom = function(roomId, callback){
	var that = this;
	var room = nowjs.getGroup(roomId);
	room.addUser(this.user.clientId);
	return callback(roomId, function(methodName){
		var args = Array.prototype.slice.call(arguments, 1);
		switch(methodName){
			case 'on':
				var event = args[0], callback = args[1];
				that.now.on(event, callback);
				break;
			case 'emit':
				var event = args[0], data = args[1];
				room.emit(event, null, data);
				break;
			default: 
				console.log('Invalid.');
		}
	});
}