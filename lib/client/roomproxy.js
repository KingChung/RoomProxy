;(function(name, definition){
	// this is considered "safe":
  	var hasDefine = typeof define === 'function',
    // hasDefine = typeof define === 'function',
    hasExports = typeof module !== 'undefined' && module.exports;

  	if (hasDefine) {
    	// AMD Module or CMD Module
    	define(definition);
  	} else if (hasExports) {
    	// Node.js Module
    	module.exports = definition(require('debug')('roomproxy'));
  	} else {
    	// Assign to common namespaces or simply the global object (window)
    	this[name] = definition();
  	}
})('RoomProxy', function(debug){
	debug = debug || function () {};

	var options = {
		io: {
			client: 'http://localhost:8080',
			lib: 'http://localhost:8080/socket.io/socket.io.js'
		}
	};

	var STATUS_PENDING = 'pending';
	var STATUS_CONNECTED = 'connected';

	var Events = function(){
		this._callbacks = {};
	}

	Events.prototype.once = function(ev, callback){
		var that = this;
		var wrapper = function(){
			callback.apply(that, arguments);
			that.unbind(ev, wrapper);
		}
		this.bind(ev, wrapper);
		return this;
	}

	Events.prototype.trigger = function(ev){
		var args = Array.prototype.slice.call(arguments, 1);
		if(this._callbacks[ev])
		{
			for(var i in this._callbacks[ev])
			{
				if('function' == this._callbacks[ev])
					this._callbacks[ev].apply(this, args);
			}
		}
		return this;
	}

	Events.prototype.bind = function(ev, callback){
		this._callbacks = this._callbacks || {};
		this._callbacks[ev] = this._callbacks[ev] || new Array();
		this._callbacks[ev].push(callback);
		return this;
	}

	Events.prototype.unbind = function(ev, callback){
		var calls = this._callbacks[ev];
		if(calls)
		{
			if( ! callback)
				calls = new Array();
			else
			{
				for (var i = calls.length - 1; i >= 0; i--)
				{
					if(callback === calls[i])
						calls[i] = null;
				}
			}
		}
		return this;
	}

	var Room = function(roomName, socket, status){
		this._roomName = roomName;
		this._socket = socket;
		this._status = status;
		this._events = new Events();
	}

	Room.prototype.changeStatus = function(status){
		var event = '';
		switch(status)
		{
			case STATUS_CONNECTED:
				this._events.trigger('_socketOnReady');
				break;
			case STATUS_PENDING:
				this._events.trigger('_socketOnPending');
				break;
		}
		this._status = status;
		return this;
	}

	Room.prototype.getInfo = function(callback){
		this._socket.emit('getClients', this._roomName, callback);
	}

	Room.prototype.on = function(event, callback){
		var that = this;
		var wrapper = function(){
			that._socket.on(that._roomName + event, function(data){
				callback(data.data);
			});
		}
		if(STATUS_PENDING == this._status)
			this._events.once('_socketOnReady', wrapper);
		else if(STATUS_CONNECTED == this._status)
			wrapper();
	}

	Room.prototype.emit = function(event, data){
		var that = this;
		var wrapper = function(){
			that._socket.emit('broadcast', {
				"roomName": that._roomName,
				"event": that._roomName + event,
				"data": data
			});
		}
		if(STATUS_PENDING == this._status)
			this._events.once('_socketOnReady', wrapper);
		else if(STATUS_CONNECTED == this._status)
			wrapper();
	}
	
	var Proxy = function(){
		var that = this;

		var wrapper = function(){
			that._socket = io.connect(options.io.client);
			that._rooms = {};
			that._status = STATUS_PENDING;
			that._events = new Events();

			that._socket.on('connect', function(){
				that._status = STATUS_CONNECTED;
				that._events.trigger('_socketOnReady');
				setTimeout(function(){
					//When socket io is on ready, to notice each room.
					for(var i in that._rooms)
						that._rooms[i].changeStatus(STATUS_CONNECTED);
				}, 0);
			});
		}

		if(window.io)
			wrapper();
		else
		{
			var interval = function(){
				if(window.io)
					wrapper();
				else
					setTimeout(interval, 1000);
			}
			setTimeout(interval, 1000);
		}
	}

	Proxy.prototype.getRoom = function(roomName){
		 return this._rooms[roomName];
	};

	/**
	 * Join a room
	 * @param  String roomName
	 * 
	 * extra arguments
	 * @param  Array userIds
	 * @param  Function callback 
	 */
	Proxy.prototype.joinRoom = function(roomName){
		var that = this;
		var args = Array.prototype.slice.call(arguments, 1)
			, userIds = []
			, callback = null;
		for(var i in args)
		{
			if(args[i] instanceof Array)
				userIds = args[i];
			else if('function' == typeof args[i])
				callback = args[i];
		}

		if( ! this._rooms[roomName]){
			this._rooms[roomName] = new Room(roomName, this._socket, this._status);

			var wrapper = function(){
				that._socket.emit('join', roomName, userIds);
			}
			if(STATUS_PENDING == this._status)
				this._events.once('_socketOnReady', wrapper);
			else if(STATUS_CONNECTED == this._status)
				wrapper();
		}

		if('function' == typeof callback)
			return callback(this._rooms[roomName]);
		else
			return this._rooms[roomName];
	}

	Proxy.prototype.leaveRoom = function(roomName, callback){
		var that = this;
		var wrapper = function(){
			that._socket.emit('leave', {roomName: roomName});
		}
		if(STATUS_PENDING == this._status)
			this._events.once('_socketOnReady', wrapper);
		else
			wrapper();
	}

	Proxy.prototype.login = function(userId){
		var that = this;
		var profile = {
			id: userId,
			profile: Array.prototype.slice.call(arguments, 1)
		};
		that._socket.emit('login', profile);
	}

	//Load dependencies library
	var dependencies = [
		{key: 'io', path: options.io.lib}
	];

	for (var i = dependencies.length - 1; i >= 0; i--) {
		if(window[dependencies[i]['key']])
			continue;

		var scriptElem = document.createElement('script');
		scriptElem.setAttribute('type', 'text/javascript');
		scriptElem.setAttribute('src', dependencies[i]['path']);
		document.getElementsByTagName('head')[0].appendChild(scriptElem);
	};

	return Proxy;
});