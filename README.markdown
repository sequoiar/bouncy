bouncy
======

Bouncy uses node's http parser innards to bounce http requests around to where
they need to go in an entirely transparent way.

Use bouncy as a load balancer or http host router, either programmatically or
with the simple command-line tool.

Bouncy is websocket-capable.

Bouncy is [faster than http-proxy@0.7.3](https://gist.github.com/1275259) in
[this benchmark](https://github.com/substack/bouncy/tree/bench).

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
    else if (req.headers.host === 'boop.example.com') {
        bounce(8002)
    }
}).listen(8000);
````

command-line
============

Just create a `routes.json` file like this:

````javascript
{
    "beep.example.com" : 8000,
    "boop.example.com" : 8001
}
````

Then point the `bouncy` command at this `routes.json` file and give it a port to
listen on:

    bouncy routes.json 80

The `routes.json` file should just map host names to host/port combos.
Use a colon-separated string to specify a host and port in a route.
Use `''` as a default route.

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

to install as a library or

    npm install -g bouncy

to get the command-line tool.

license
=======

MIT/X11
