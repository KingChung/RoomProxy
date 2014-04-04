var app = require('roomproxy')
	, httpServer = require('http').createServer().listen(8080);
app(httpServer);