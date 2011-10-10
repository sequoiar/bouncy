var test = require('tap').test;
var bouncy = require('../');
var ws = require('websocket-server');
var wc = require('websocket-client').WebSocket;


test('ws', function (t) {
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s0 = ws.createServer();
    s0.on('connection', function (c) {
console.log('connection!');
        var msgs = [ 'beepity', 'boop' ];
        c.on('message', function (msg) {
            t.equal(msg, msgs.shift());
            c.send(msg.reverse());
            if (msgs.length === 0) c.close();
        });
    });
    s0.listen(p0, connect);
    
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s1 = bouncy(function (req, bounce) {
console.dir(req);
        bounce(p0);
    });
    s1.listen(p1, connect);
    
    var connected = 0;
    function connect () {
        if (++connected !== 2) return;
        
        var ws = new wc('ws://localhost:' + p1 + '/', 'biff');
        ws.on('open', function () {
            ws.send('beepity');
            setTimeout(function () {
                ws.send('boop');
            }, 15);
        });
        
        var msgs = [ 'ytipeeb', 'poob' ];
        ws.on('data', function (buf) {
            t.equal(buf.toString(), msgs.shift());
        });
        
        ws.on('end', function () {
            t.end();
        });
    }
});
