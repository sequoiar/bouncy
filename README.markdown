bouncy
======

Bouncy uses node's http parser innards to bounce http requests around to where
they need to go in an entirely transparent way.

Use bouncy as a load balancer or http host router, either programmatically or
with the simple command-line tool.

Bouncy is websocket-capable.

Bouncy 0.0.4 is [faster than http-proxy 0.7.3](https://gist.github.com/1275259) in
[this benchmark](https://github.com/substack/bouncy/tree/master/bench).

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

Use `""` for the host as a default route.

An x-forwarded-for header will be sent automatically.

bouncy(cb)
==========

`bouncy(cb)` returns a new net.Server object that you can `.listen()` on.

Your callback `cb` will get these arguments:

req
---

The node http module request object.

bounce(stream, opts={})
-----------------------

Call this function when you're ready to bounce the request to a stream.

The exact request that was received will be written to `stream` and future
incoming data will be piped to and from it.

You can specify header fields to insert into the request with `opts.headers`.

For instance you might want to add an `"x-forwarded-for"` header:

```javascript
var bouncy = require('bouncy');

bouncy(function (req, bounce) {
    bounce(5000, { headers : 'x-forwarded-for' : req.socket.remoteAddress });
}).listen(80);
````

bounce(port, ...), bounce(host, port, ...)
------------------------------------------

These variants of `bounce()` are sugar for
`bounce(net.createConnection(port))`
and
`bounce(net.createConnection(port, host))`.

Optionally you can pass port and host keys to `opts` and it does the same thing.

bounce.respond()
----------------

Return a new HTTP response object for the request.
This is useful if you need to write an error result.

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
