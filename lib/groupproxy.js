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
    	module.exports = definition(require('debug')('groupproxy'));
  	} else {
    	// Assign to common namespaces or simply the global object (window)
    	this[name] = definition();
  	}
})('GroupProxy', function(debug){
	debug = debug || function () {};

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

	var STATUS_PENDING = 'pending';
	var STATUS_CONNECTED = 'connected';
	
	var Proxy = function(path){
		var that = this;
		this._socket = io.connect(path);
		this._rooms = {};
		this._status = STATUS_PENDING;
		this._events = new Events();

		this._socket.on('connect', function(){
			that._status = STATUS_CONNECTED;
			that._events.trigger('_socketOnReady');
			console.log('socket connect');
			setTimeout(function(){
				//When socket io is on ready, to notice each room.
				for(var i in that._rooms)
					that._rooms[i].changeStatus(STATUS_CONNECTED);
			}, 0);
		});
	}

	Proxy.prototype.getRoom = function(roomName){
		 return this._rooms[roomName];
	};

	Proxy.prototype.joinRoom = function(roomName, callback){
		var that = this;
		if( ! this._rooms[roomName]){
			this._rooms[roomName] = new Room(roomName, this._socket, this._status);

			var wrapper = function(){
				that._socket.emit('join', {roomName: roomName});
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

	var Room = function(roomName, socket, status){
		this._roomName = roomName;
		this._socket = socket;
		this._status = status;
		this._events = new Events();
	}

	Room.prototype.changeStatus = function(status){
		this._status = status;
		this._events.trigger('_socketOnReady');
	}

	Room.prototype.getInfo = function(callback){
		this._socket.emit('getClients', this._roomName, callback);
	}

	Room.prototype.on = function(event, callback){
		var that = this;
		var wrapper = function(){
			that._socket.on(that._roomName + event, function(data){
				callback(data);
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

	return Proxy;
});