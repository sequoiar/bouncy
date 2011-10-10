var http = require('http');
var ServerResponse = http.ServerResponse;
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
    var bufSize = 0;
    
    function respond (req, bytesInHeader) {
        var bufs = buffers;
        buffers = [];
        bufSize = 0;
        
        if (req.upgrade) {
            req.pause();
        }
        else {
            req.socket.pause();
        }
        
        var bounce = function (stream, y) {
            if (!stream || !stream.write) {
                stream = parseArgs(stream, y);
            }
            
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
            
            if (req.upgrade) {
                req.socket.pipe(stream);
                stream.pipe(c);
                req.socket.resume();
            }
            else {
                req.pipe(stream);
                stream.pipe(c);
                req.resume();
            }
        };
        
        bounce.respond = function () {
            var res = new ServerResponse(req);
            res.assignSocket(req.socket);
            return res;
        };
        
        cb(req, bounce);
    };
    
    c.on('data', function onData (buf) {
        buffers.push(buf);
        bufSize += buf.length;
        
        var ret = parser.execute(buf, 0, buf.length);
        if (ret instanceof Error) {
            c.destroy();
        }
        else if (parser.incoming && parser.incoming.upgrade) {
            c.removeListener('data', onData);
            respond(parser.incoming, bufSize);
            buffers = [];
            bufSize = 0;
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

function parseArgs (x, y) {
    if (typeof x === 'string' && typeof y === 'number') {
        // flip host and port
        return net.createConnection(y, x);
    }
    else if (typeof x === 'string' && typeof y === 'string'
    && /^\d+$/.test(y)) {
        // convert string port to number
        return net.createConnection(parseInt(y,10), x);
    }
    else if (typeof x === 'string' && typeof y === 'string'
    && /^\d+$/.test(x)) {
        // convert string port to number, flipped
        return net.createConnection(parseInt(x,10), y);
    }
    else if (y) {
        return net.createConnection(x, y);
    }
    else {
        return net.createConnection(x);
    }
}
