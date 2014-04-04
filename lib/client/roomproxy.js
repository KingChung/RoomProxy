;(function(name, definition){
	// this is considered "safe":
  	var hasDefine = typeof define === 'function';

  	if (hasDefine) {
    	// AMD Module or CMD Module
    	define(definition);
  	} else {
    	// Assign to common namespaces or simply the global object (window)
    	this[name] = definition;
  	}
})('RoomProxy', function(){
	//@TODO
	options = window.ROOMPROXY_CONFIG || {};

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
				if('function' == typeof this._callbacks[ev][i])
					this._callbacks[ev][i].apply(this, args);
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
		this.id = this._roomName = roomName;
		this._socket = socket;
		this._status = status;
		this._events = new Events();
		this._eventsCache = {};
	}

	Room.prototype.delay = function(callback){
		if(STATUS_PENDING == this._status)
			this._events.once('_socketOnReady', callback);
		else if(STATUS_CONNECTED == this._status)
			callback();
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

	Room.prototype.getUserIds = function(callback){
		this._socket.emit('getClientUserIds', this._roomName, callback);
	}

	Room.prototype.on = function(event, callback){
		var that = this;
		this.delay(function(){
			that._socket.on(that._roomName + event, function(data){
				if('function' == typeof callback)
					callback(data);
			});
		});

		if(this._eventsCache[event] instanceof Array) {
			this._eventsCache[event].push(callback);
		} else {
			this._eventsCache[event] = [callback];
		}
	}

	Room.prototype.once = function(event, callback){
		var that = this;
		this.on(event, function(){
			if('function' === typeof callback)
				callback.apply(null, arguments);
			that._socket.removeAllListeners(that._roomName + event);
			that._eventsCache[event] = null;
		}, true);
	}

	Room.prototype.emit = function(event, data){
		var that = this;
		this.delay(function(){
			that._socket.emit('broadcast', {
				"roomName": that._roomName,
				"event": that._roomName + event,
				"data": data
			});
		});
	}

	Room.prototype.leave = function(){
		var that = this;
		this.delay(function(){
			//Notify every member
			that.emit('leave');
			that._socket.emit('leave', that._roomName);
		});
	};

	Room.prototype.get = function(attrName){
		return this[attrName];
	}
	
	Room.prototype.getEventsCache = function(){
		return this._eventsCache;
	}

	var Proxy = function(){
		var that = this;
		that._status = STATUS_PENDING;
		that._events = new Events();
		that._userId = '';

		var wrapper = function(){
			that._rooms = {};
			that._socket = io.connect(options.io.client);

			that._socket.on('connect', function(){
				that._status = STATUS_CONNECTED;
				that._events.trigger('_socketOnReady');
				setTimeout(function(){
					//When socket io is on ready, to notice each room.
					for(var i in that._rooms)
						that._rooms[i].changeStatus(STATUS_CONNECTED);
				}, 0);
			});

			that._socket.on('reconnect', function(){
				//Login
				that.login(that._userId);

				var oldRooms = that._rooms;
				that._rooms = {};
				
				var i = null;
				for(i in oldRooms) {
					var room = oldRooms[i];
					if(room instanceof Room) {
						var events = room._eventsCache;
						that.joinRoom(i, function(room){
							for(var j in events) {
								var cbs = events[j];
								for(var k in cbs) {
									if("function" === typeof cbs[k]) {
										room.on(j, cbs[k]);
									}
								}
							}
						});
					}
				}
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

	Proxy.prototype.set = function(key, value){
		this.emit('store', key, value);
	}

	Proxy.prototype.get = function(key, callback){
		if("function" === typeof callback) {
			this.emit('store', key, callback);
		}
	}

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
			this.emit('join', roomName, userIds);
		}

		if('function' == typeof callback)
			return callback(this._rooms[roomName]);
		else
			return this._rooms[roomName];
	}

	Proxy.prototype.leaveRoom = function(roomName, callback){
		var that = this;
		this.emit('leave', roomName);
	}

	Proxy.prototype.login = function(userId){
		this._userId = userId;
		this.emit('login', userId);
	}

	Proxy.prototype.delay = function(callback){
		if(STATUS_PENDING == this._status)
			this._events.once('_socketOnReady', callback);
		else if(STATUS_CONNECTED == this._status)
			callback();
	}

	Proxy.prototype.emit = function(event){
		var that = this, args = arguments;
		this.delay(function(){
			that._socket.emit.apply(that._socket, args);
		});
	}

	Proxy.prototype.on = function(event, callback){
		var that = this;
		this.delay(function(){
			that._socket.on(event, function(){
				if('function' == typeof callback)
					callback.apply(this, arguments);
			});
		});
	}

	Proxy.prototype.once = function(event, callback){
		var that = this;
		this.on(event, function(){
			if('function' == typeof callback)
				callback.apply(this, arguments);
			that._socket.removeAllListeners(event);
		});
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