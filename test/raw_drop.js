var test = require('tap').test;
var bouncy = require('bouncy');
var net = require('net');

test('drop a socket', function (t) {
    t.plan(2);
    
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    
    var s0 = bouncy(function (req, bounce) {
        t.equal(req.headers.host, 'lulzy');
        
        var c = net.createConnection(p1, function () {
            c.destroy();
            t.doesNotThrow(
                function () { bounce(c) },
                'bounce should not throw when the connection is closed'
            );
            
            process.nextTick(function () {
                req.socket.end();
                s0.close();
                s1.close();
                t.end();
            });
        });
    });
    
    var s1 = net.createServer(function (c) {
         // ...
    });
    s1.listen(p1);
    
    s0.listen(p0, function () {
        var c = net.createConnection(p0, function () {
            c.write('GET /lul HT');
            setTimeout(function () {
                c.write('TP/1.1\r\nHo');
            }, 20);
            setTimeout(function () {
                c.write('st: lulz');
            }, 40);
            setTimeout(function () {
                c.write('y\r\nFoo: bar');
            }, 60);
            setTimeout(function () {
                c.write('\r\n\r\n');
            }, 80);
            setTimeout(function () {
                c.end();
            }, 100);
        });
    });
});
