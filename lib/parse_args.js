var net = require('net');

module.exports = function (args) {
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
