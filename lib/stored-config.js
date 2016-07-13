'use strict';

var $fs = require('fs');
var $path = require('path');

var $mkdirp = require('mkdirp');
var $q = require('q');

module.exports = {
    retrieve: retrieve,
    store: store,
    clear: clear
};

function retrieve (path) {

    var deferred = $q.defer();

    try {

        var storedConfig = $fs.readFileSync(path).toString();

        storedConfig = JSON.parse(storedConfig);


        deferred.resolve(storedConfig);

    } catch (e) {

        deferred.reject();

    }

    return deferred.promise;

}

function store (path, config) {

    var deferred = $q.defer();

    try {
        $mkdirp.sync($path.dirname(path));
    } catch (e) {}

    $fs.writeFileSync(path, JSON.stringify(config, null, 4));

    deferred.resolve();

    return deferred.promise;

}

function clear (path) {

    var deferred = $q.defer();

    try {
        $fs.unlinkSync(path);
    } catch (e) {}

    deferred.resolve();

    return deferred.promise;

}
