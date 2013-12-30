#GroupProxy

> 你若触发，我就广播。

GroupProxy是一个群组事件广播模块。它有几个feature：

1. 群组在这里被命名为房间（Room），一个房间可以有多个成员（Client），通过Room API可获取房间信息。
2. Room实现`订阅/发布`模式，可通过API进行任意事件绑定与发布，触发的事件会广播到Room内每个成员。
3. 模块只实现Client之间的通知、通讯功能，业务逻辑交还调用者设定。


##使用方法

###引入依赖库###
	
	//socket.io
	<script src="http://localhost:3000/socket.io/socket.io.js"></script>

	//groupproxy库
	<script src="../lib/groupproxy.js"></script>
	
###创建GroupProxy实例
	
	var proxy = new GroupProxy('http://localhost:3000');

`GroupProxy`对象在引入的时候会赋予全局对象；初始化需要传入参数为socket连接地址。

###APIs

####GroupProxy

#####joinRoom(string roomName, [function callback])#####

	//用法一
	proxy.joinRoom('test', function(room){
		//do somethings
	});
	
	//用法二
	var room = proxy.joinRoom('test2');
	//do somethings

#####leaveRoom(string roomName)#####

#####getRoom(string roomName)#####
	
	var room = proxy.getRoom('test');
	//do somethings

####Room

#####on(string event, function callback) | emit(string event, JSON data)
	
	var room = proxy.getRoom('test');
	
	//绑定`message`事件
	room.on('message', function(err, data){
		if(! err)
			console.log(data); //{roomName: 'test', event: 'message', data: {message: 'hello world'}}
	});
	
	//广播触发`message`事件
	room.emit('message', {message: 'hello world.'});

#####getInfo(function callback)

	room.getInfo(function(data){
		console.log(data); //{client_ids: [xxx,yyy,zzz]}
	});

暂时只返回'client_ids'.