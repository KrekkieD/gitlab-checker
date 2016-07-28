'use strict';

var $q = require('q');

var $request = require('./request');

module.exports = {
    create: create
};

function create (config) {

    return new GitlabApi(config);

}

function GitlabApi (config) {

    var self = this;

    self.config = {};
    self.config.privateToken = config.privateToken;
    self.config.host = config.host;

    self.getStarredProjects = getStarredProjects;
    self.getProject = getProject;
    self.getPackageJson = getPackageJson;
    self.getMergeRequests = getMergeRequests;
    self.getTags = getTags;
    self.getBranches = getBranches;

    function getStarredProjects () {

        return $request({
            host: self.config.host,
            method: 'GET',
            path: '/api/v3/projects/starred/?per_page=100&private_token=' + self.config.privateToken
        })
        .then(function (result) {

            var deferreds = [];

            var projects = JSON.parse(result.data);
            projects.forEach(function (project, key) {

                var promise = getProject(project.id)
                    .then(function (project) {
                        projects[key] = project;
                    });

                deferreds.push(promise);

            });

            return $q.all(deferreds)
                .then(function () {
                    return projects;
                });

        });

    }

    function getProject (repoId) {

        return $request({
            host: self.config.host,
            method: 'GET',
            path: '/api/v3/projects/' + repoId + '?per_page=100&private_token=' + self.config.privateToken
        })
        .then(function (result) {

            return JSON.parse(result.data);

        });

    }

    function getPackageJson (repoId, ref) {

        return $request({
            host: self.config.host,
            method: 'GET',
            path: '/api/v3/projects/' + repoId + '/repository/files?file_path=package.json&ref=' + ref + '&private_token=' + self.config.privateToken
        })
        .then(function (result) {

            var data = JSON.parse(result.data);

            if (!data.content) {
                return {
                    version: 'NO package.json'
                };
            }

            var buf = new Buffer(data.content, 'base64').toString(); // Ta-da

            return JSON.parse(buf);

        });

    }

    function getMergeRequests (repoId) {

        return $request({
            host: self.config.host,
            method: 'GET',
            path: '/api/v3/projects/' + repoId + '/merge_requests?state=opened&private_token=' + self.config.privateToken
        })
        .then(function (result) {

            return JSON.parse(result.data);

        });

    }

    function getTags (repoId) {

        return $request({
            host: self.config.host,
            method: 'GET',
            path: '/api/v3/projects/' + repoId + '/repository/tags?private_token=' + self.config.privateToken
        })
        .then(function (result) {

            var tags = JSON.parse(result.data);

            // need to manually sort tags because they're sorted alphabetically by default
            tags.sort(function (a, b) {

                var dateA = new Date(a.commit.authored_date);
                var dateB = new Date(b.commit.authored_date);

                return dateB.getTime() - dateA.getTime();

            });

            return tags;

        });


    }

    function getBranches (repoId) {

        return $request({
            host: self.config.host,
            method: 'GET',
            path: '/api/v3/projects/' + repoId + '/repository/branches?private_token=' + self.config.privateToken
        })
        .then(function (result) {

            return JSON.parse(result.data);

        });

    }

}

