var bouncy = require('bouncy');

bouncy(function (req, bounce) {
    bounce(8002, { headers : 'x-forwarded-for' : req.socket.remoteAddress });
}).listen(8001);
