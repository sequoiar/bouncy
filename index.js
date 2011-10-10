var http = require('http');
var ServerResponse = http.ServerResponse;
var parsers = http.parsers;
var insertHeaders = require('./lib/insert_headers');

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
        
        var bounce = function (stream, opts) {
            if (!stream || !stream.write) {
                opts = parseArgs(arguments);
                stream = opts.stream;
            }
            if (!opts) opts = {};
            
            if (opts.headers) {
                bytesInHeader += insertHeaders(bufs, opts.headers);
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

function parseArgs (args) {
    var opts = {};
    
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        
        if (typeof arg === 'number') {
            opts.port = arg;
        }
        else if (typeof arg === 'string') {
            if (/^\d+$/.test(arg)) opts.port = parseInt(arg, 10)
            else if (/\//.test(arg)) opts.unix = arg
            else opts.host = arg;
        }
        else if (typeof arg === 'object') {
            if (arg.write) opts.stream = arg;
            else {
                for (var key in arg) {
                    opts[key] = arg[key]
                }
            }
        }
    }
    
    if (!opts.stream) {
        if (opts.unix) {
            opts.stream = net.createConnection(opts.unix);
        }
        else if (opts.host && opts.port) {
            opts.stream = net.createConnection(opts.port, opts.host);
        }
        else if (opts.port) {
            opts.stream = net.createConnection(opts.port);
        }
    }
    
    return opts;
}
