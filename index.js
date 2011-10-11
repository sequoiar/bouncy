var http = require('http');
var ServerResponse = http.ServerResponse;
var parsers = http.parsers;

var insertHeaders = require('./lib/insert_headers');
var parseArgs = require('./lib/parse_args');

var net = require('net');
var tls = require('tls');

var bouncy = module.exports = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    
    if (opts && opts.key && opts.cert) {
        return tls.createServer(opts, handler.bind(null, cb));
    }
    else {
        return net.createServer(handler.bind(null, cb));
    }
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
            
            if (!opts.hasOwnProperty('headers')) opts.headers = {};
            
            if (opts.headers) {
                if (!opts.headers.hasOwnProperty('x-forwarded-for')) {
                    opts.headers['x-forwarded-for'] = c.remoteAddress;
                }
                if (!opts.headers.hasOwnProperty('x-forwarded-port')) {
                    var m = (req.headers.host || '').match(/:(\d+)/);
                    opts.headers['x-forwarded-port'] = m && m[1] || 80;
                }
                if (!opts.headers.hasOwnProperty('x-forwarded-proto')) {
                    opts.headers['x-forwarded-proto'] = 'http';
                }
            }
            
            if (opts.headers) {
                bytesInHeader += insertHeaders(bufs, opts.headers);
            }
            
            var written = 0;
            
            for (var i = 0; i < bufs.length; i++) {
                var buf = bufs[i];
                
                if (written + buf.length > bytesInHeader) {
                    try {
                        stream.write(buf.slice(0, bytesInHeader - written));
                        break;
                    }
                    catch (err) {
                        if (opts.emitter) {
                            opts.emitter.emit('drop', c);
                        }
                        else {
                            c.destroy();
                        }
                        return;
                    }
                }
                else {
                    try {
                        stream.write(buf);
                    }
                    catch (err) {
                        if (opts.emitter) {
                            opts.emitter.emit('drop', c);
                        }
                        else {
                            c.destroy();
                        }
                        return;
                    }
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
