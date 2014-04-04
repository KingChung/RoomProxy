var cp = require('child_process');
// gzip
module.exports.gzip = function (data, callback) {
  var gzip = cp.spawn('gzip', ['-9', '-c', '-f', '-n'])
    , encoding = Buffer.isBuffer(data) ? 'binary' : 'utf8'
    , buffer = []
    , err;

  gzip.stdout.on('data', function (data) {
    buffer.push(data);
  });

  gzip.stderr.on('data', function (data) {
    err = data +'';
    buffer.length = 0;
  });

  gzip.on('close', function () {
    if (err) return callback(err);

    var size = 0
      , index = 0
      , i = buffer.length
      , content;

    while (i--) {
      size += buffer[i].length;
    }

    content = new Buffer(size);
    i = buffer.length;

    buffer.forEach(function (buffer) {
      var length = buffer.length;

      buffer.copy(content, index, 0, length);
      index += length;
    });

    buffer.length = 0;
    callback(null, content);
  });

  gzip.stdin.end(data, encoding);
};