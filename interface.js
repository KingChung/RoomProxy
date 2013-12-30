//Client
Client.Data
	init()
	clode()
	set/getAttributes()

Client.Room
	join(id)
	publish()
	subscribe()
	quit()

Client.Events

//Server
Server
	.createRoom()
	.getRooms()
	.getRoom(id, function(){

	})
	.deleteRoom()

Room = {
	id: 'xxx',
	name: 'xxx'
}
Room.
	on('xxx', function(){

	})
	emit('xxx')


//Proxy
Proxy = {
	id: clientId,
	user: {},
	status: '',
}

Proxy.connect(function(session){
	session.on('receiveCall', function(err, sender, data){
		Proxy.joinRoom(data.id, function(room){
			room.on('xxx', function(){

			});
		});
	});

	Proxy.createRoom(function(room){
		Proxy.sendCall('userid');
		room.on('joined', function(){
			//render chat window
		});

	});

	session.on(event, function(err, sender, data){

	});
});

//Server
Client.createRoom(function(room){
	room = {
		id: 'xxx',
		status: '',
		users: []
	}

	room.on(event, function(pkg){
		pkg = {
			sender: {},
			data: {},
		}
		//todo something
	});
	room.emit(event, {data: 'xxx'});
});

Client.joinRoom('', function(room){

});

Client.quitRoom('');