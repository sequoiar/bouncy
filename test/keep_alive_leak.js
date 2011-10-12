var test = require('tap').test;
var bouncy = require('../');
var http = require('http');
var net = require('net');
var lazy = require('lazy');

test("make sure keep-alives don't leak", function (t) {
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    
    //t.plan(3);
    var s0 = bouncy(function (req, bounce) {
        t.equal(req.headers.host, 'beep.boop');
        bounce(p1);
    });
    
    s0.listen(p0, function () {
        var times = 0;
        request(p0, t, function redo (send) {
            if (times++ < 3) send(redo.bind(null, send))
            else {
                send(null);
                s0.close();
                s1.close();
                t.end();
            }
        });
    });
    
    var s1 = http.createServer(function (req, res) {
        t.equal(req.method, 'POST');
        t.equal(req.headers.host, 'beep.boop');
        t.equal(req.headers.connection, 'keep-alive');
        t.equal(req.headers['transfer-encoding'], 'chunked');
        
        var data = '';
        req.on('data', function (buf) {
            data += buf.toString();
        });
        
        req.on('end', function () {
            t.equal(data, 'abcdefghij');
            
            res.setHeader('content-type', 'text/plain');
            res.setHeader('connection', 'keep-alive');
            
            setTimeout(function () {
                res.write('oh');
            }, 10);
            
            setTimeout(function () {
                res.write(' hello\r\n');
                res.end();
            }, 20);
        });
    });
    s1.listen(p1);
});

function request (port, t, cb) {
    var c = net.createConnection(port, function () {
        cb(send);
    });
    
    function send (fn) {
        if (!fn) { c.end(); return }
        
        c.write([
            'POST / HTTP/1.1',
            'Host: beep.boop',
            'Connection: keep-alive',
            'Transfer-Encoding: chunked',
            '',
            '',
        ].join('\r\n'));
        
        var chunks = [
            '3\r\nabc\r\n',
            '2\r\nde\r\n',
            '5\r\nfghij\r\n',
            '0\r\n\r\n',
        ];
        
        var finished = false;
        var iv = setInterval(function () {
            var chunk = chunks.shift();
            if (chunk) c.write(chunk)
            if (chunks.length === 0) {
                clearInterval(iv);
                finished = true;
            }
        }, 50);
        
        var lines = [''];
        var mode = 'header';
        
        c.on('data', function onData (buf) {
            for (var i = 0; i < buf.length; i++) {
                if (buf[i] !== '\n'.charCodeAt(0)) {
                    lines[lines.length-1] += String.fromCharCode(buf[i])
                    continue;
                }
                
                lines.push('');
                if (mode === 'header' && lines[lines.length-2] === '\r') {
                    mode = 'body';
                }
                else if (mode === 'body' && lines[lines.length-2] === '0\r') {
                    c.removeListener('data', onData);
                    
                    function upcase (s) { return s.toUpperCase() }
                    
                    t.ok(finished);
                    t.deepEqual(lines.slice(0,4).map(upcase).sort(), [
                        'HTTP/1.1 200 OK\r',
                        'Content-Type: text/plain\r',
                        'Transfer-Encoding: chunked\r',
                        'Connection: keep-alive\r',
                    ].sort().map(upcase));
                    
                    t.deepEqual(lines.slice(4), [
                        '\r',
                        '2\r',
                        'oh\r',
                        '8\r',
                        ' hello\r',
                        '\r',
                        '0\r',
                        ''
                    ]);
                    
                    fn();
                }
            }
        });
        
    }
}
