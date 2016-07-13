'use strict';

var $https = require('https');
var $http = require('http');
var $url = require('url');

var $q = require('q');

module.exports = request;

function request (options, body) {

    var deferred = $q.defer();

    var parsedHost = $url.parse(options.host);

    var requestLib = parsedHost.protocol === 'https:' ? $https : $http;

    options.host = parsedHost.host;

    options.headers = options.headers || {};

    if (options.method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
    }

    var req = requestLib.request(options, function (res) {

        var buffer = [];
        res.on('data', function (chunk) {
            buffer.push(chunk);
        });
        res.on('end', function () {

            req.body = body;

            var response = {
                path: options.path,
                method: options.method,
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                data: Buffer.concat(buffer).toString(),
                headers: res.headers,
                res: res,
                req: req
            };

            deferred.resolve(response);
        });

    });

    req.on('error', function (e) {
        deferred.reject(e);
    });

    // write data to request body
    if (body) {
        req.write(JSON.stringify(body));
    }
    req.end();

    return deferred.promise;

}
