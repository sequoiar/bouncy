var http = require('http');
var parsers = http.parsers;

var net = require('net');

var bouncy = module.exports = function (cb) {
    return net.createServer(handler.bind(null, cb));
};

var handler = bouncy.handler = function (cb, c) {
    var parser = parsers.alloc();
    parser.reinitialize('request');
    parser.socket = c;
    parser.incoming = null;
    
    var request = null;
    parser.onIncoming = function (req, shouldKeepAlive) {
        request = req;
    };
    
    var buffers = [];
    function respond (req, bytesInHeader) {
        var bufs = buffers;
        buffers = [];
        
        req.pause();
        cb(req, function (stream) {
            var written = 0;
            for (var i = 0; i < bufs.length; i++) {
                var buf = bufs[i];
                if (written + buf.length > bytesInHeader) {
                    stream.write(buf.slice(0, bytesInHeader - written));
                    break;
                }
                else {
                    stream.write(buf);
                    written += buf.length;
                }
            }
            req.pipe(stream);
            stream.pipe(c);
            req.resume();
        });
    };
    
    c.on('data', function (buf) {
        buffers.push(buf);
        
        var ret = parser.execute(buf, 0, buf.length);
        if (ret instanceof Error) {
            c.destroy();
        }
        else if (request) {
            respond(request, ret);
            request = null;
        }
    });
    
    c.on('close', function () {
        parsers.free(parser);
    });
    
    c.on('end', function () {
        parser.finish();
        c.destroy();
    });
};
