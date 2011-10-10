// bounce requests to :8001 along to :8000

var bouncy = require('../');
var net = require('net');

bouncy(function (req, proxy) {
    var stream = net.createConnection(8000);
    proxy(stream);
}).listen(8001);
