bouncy
======

Bouncy uses node's http parser innards to bounce http requests around to where
they need to go in an entirely transparent way.

Use bouncy as a load balancer or http host router.

example
=======

bounce.js
---------

Bounce requests to :8001 along to :8000...

````javascript
var bouncy = require('bouncy');
var net = require('net');

bouncy(function (req, bounce) {
    var stream = net.createConnection(8000);
    bounce(stream);
}).listen(8001);
````

methods
=======

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
