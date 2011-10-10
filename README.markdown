bouncy
======

Bouncy uses node's http parser innards to bounce http requests around to where
they need to go in an entirely transparent way.

Use bouncy as a load balancer or http host router.

example
=======

route.js
--------

Route requests based on the host field

````javascript
var bouncy = require('bouncy');

bouncy(function (req, bounce) {
    if (req.headers.host === 'beep.example.com') {
        bounce(8001);
    }
    else if (req.headers.host === 'boop.example.come') {
        bounce(8002)
    }
}).listen(8000);
````

bounce.js
---------

Bounce all requests received on :8001 along to :8000

````javascript
var bouncy = require('bouncy');

bouncy(function (req, bounce) {
    bounce(8000);
}).listen(8001);
````

bouncy(cb)
==========

There is only one method, `bouncy(cb)`. Your callback `cb` will get these
arguments:

req
---

The node http module request object.

bounce(stream)
--------------

Call this function when you're ready to bounce the request to a stream.

The exact request that was received will be written to `stream` and future
incoming data will be piped to and from it.

bounce(port), bounce(host, port)
--------------------------------

These variants of `bounce()` are sugar for
`bounce(net.createConnection(port))`
and
`bounce(net.createConnection(port, host))`.

install
=======

With [npm](http://npmjs.org), do:

    npm install bouncy

license
=======

MIT/X11
