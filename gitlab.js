#! /usr/bin/env node

'use strict';

var $path = require('path');

var $q = require('q');
var $colors = require('colors');
var $prompt = require('prompt');
var $yargs = require('yargs');

var $gitlabApi = require('./lib/gitlab-api');
var $storedConfig = require('./lib/stored-config');

var storedConfigPath = $path.resolve(__dirname, 'tmp/stored-config.json');

gitlabChecker();

function gitlabChecker () {

    _cli($yargs.argv);

    $storedConfig.retrieve(storedConfigPath)
        .then(function (config) {

            console.log('Using stored config.');

            return config;

        }, _prompt)
        .then(function (config) {

            _checkMergeRequests(config)
                .then(_output)
                .done();

        });

}

function _cli (args) {

    if (args.help) {
        _help();
        process.exit(0);
    }
    else if (args.clearConfig) {
        _clearConfig();
        process.exit(0);
    }

    function _clearConfig () {

        console.log('Clearing stored config.');
        $storedConfig.clear(storedConfigPath);

    }

    function _help () {

        console.log();
        console.log('Commands:');
        console.log('-----------');

        var cmds = [
            ['gitlab-checker', 'run'],
            ['gitlab-checker --help', 'show help (this)'],
            ['gitlab-checker --clearConfig', 'remove stored config']
        ];

        cmds.forEach(function (cmd) {
            console.log('    ' + (cmd[0] + '                   ').substr(0, 30) + ' : ' + cmd[1]);
        });

    }

}

function _prompt () {

    var deferred = $q.defer();

    $prompt.start();

    $prompt.get([
        {
            name: 'gitlabHost',
            description: 'Enter the Gitlab host (including protocol)'
        },
        {
            name: 'privateToken',
            description: 'Provide your private token'
        },
        {
            name: 'store',
            description: 'Store repo configuration? (y/n)',
            pattern: /^[yn]$/
        }
    ], function (err, result) {

        var config = {
            gitlabHost: result.gitlabHost,
            privateToken: result.privateToken
        };

        if (result.store === 'y') {

            return $storedConfig.store(storedConfigPath, config)
                .then(function () {

                    console.log('Config stored.');
                    deferred.resolve(config);

                });

        }

        deferred.resolve(config);

    });

    return deferred.promise;

}

function _checkMergeRequests (config) {

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    var api = $gitlabApi.create({
        host: config.gitlabHost,
        privateToken: config.privateToken
    });

    console.log('Checking starred repositories on Gitlab..');

    return api.getStarredProjects()
        .then(function (repos) {

            var output = [];

            var deferreds = [];

            if (repos.length === 0) {
                console.log('No starred repos found?');
            }

            repos.forEach(function (repo, key) {

                if (repo.permissions.project_access === null &&
                    repo.permissions.group_access === null) {

                    return false;

                }

                output.push(repo);

                var mergeRequestsPromise = api.getMergeRequests(repo.id)
                    .then(function (mergeRequests) {

                        repo.merge_requests = mergeRequests;

                    });

                var tagPromise = api.getTags(repo.id)
                    .then(function (tags) {

                        repo.tags = tags;

                    });

                var branchesPromise = api.getBranches(repo.id)
                    .then(function (branches) {

                        repo.branches = branches;

                        var packageJsonDeferreds = [];

                        branches.forEach(function (branch) {

                            var packageJsonPromise = api.getPackageJson(repo.id, branch.commit.id)
                                .then(function (packageJson) {
                                    branch.packageJson = packageJson;
                                });

                            packageJsonDeferreds.push(packageJsonPromise);

                        });

                        return $q.all(packageJsonDeferreds);

                    });

                deferreds.push(mergeRequestsPromise);
                deferreds.push(tagPromise);
                deferreds.push(branchesPromise);

            });

            return $q.all(deferreds)
                .then(function () {
                    return output;
                }, function (err) {
                    console.log(err);
                });

        });

}

function _output (repos) {

    // sort repos
    repos.sort(function (a, b) {

        if (a.name_with_namespace.toLowerCase() < b.name_with_namespace.toLowerCase()) {
            return -1;
        }
        else {
            return 1;
        }

    });

    repos.forEach(function (repo) {

        var repoLog = {
            shouldLog: false,
            repo: $colors.green(repo.name_with_namespace),
            mergeRequests: [],
            branches: [],
            otherBranches: [],
            tags: []
        };

        var mergeRequests = repo.merge_requests;
        var tags = repo.tags;
        var branches = repo.branches;


        // check if master and develop are aligned
        var masterBranch;
        var developBranch;

        branches.forEach(function (branch) {
            if (branch.name === 'master') {
                masterBranch = branch;
            }
            else if (branch.name === 'develop') {
                developBranch = branch;
            }
            else {
                repoLog.otherBranches.push($colors.white.italic('    Open branch: ' + branch.name + '@' + branch.packageJson.version));
            }
        });

        if (masterBranch && developBranch) {

            if (masterBranch.commit.id !== developBranch.commit.id) {
                repoLog.shouldLog = true;
                repoLog.branches.push($colors.grey('    [ UNSTABLE ]') + ' Branches master and develop are not identical, unreleased code present.');
                repoLog.branches.push('        Last commit on master@' + masterBranch.packageJson.version + ': ' + _formatCommitMessage(masterBranch.commit));
                repoLog.branches.push('        Last commit on develop@' + developBranch.packageJson.version + ': ' + _formatCommitMessage(developBranch.commit));
            }

        }

        // sort merge requests
        if (mergeRequests.length) {

            mergeRequests.sort(function (a, b) {

                return a.iid - b.iid;

            });

            mergeRequests.forEach(function (mergeRequest) {

                repoLog.shouldLog = true;

                repoLog.mergeRequests.push($colors.cyan('    Merge Request: !' + mergeRequest.iid + ' ' + mergeRequest.title + ' (' + mergeRequest.merge_status + ')'));
                repoLog.mergeRequests.push($colors.grey('            ' + mergeRequest.source_branch + ' -> ' + mergeRequest.target_branch));
                repoLog.mergeRequests.push($colors.grey('            ' + repo.web_url.split('://')[1] + '/merge_requests/' + mergeRequest.iid));
                repoLog.mergeRequests.push('            by ' + mergeRequest.author.name + ', ' + mergeRequest.created_at.split('T')[0]);
                repoLog.mergeRequests.push();

            });

        }






        if (masterBranch && developBranch) {

            repoLog.shouldLog = true;

            if (masterBranch.commit.id === developBranch.commit.id) {

                if (tags.length && masterBranch.commit.id === tags[0].commit.id) {
                    repoLog.branches.push($colors.green('    [ CLEAN ]') + ' Branches master/develop and latest tag at ' + tags[0].name);
                }
                else {
                    repoLog.branches.push($colors.cyan('    [ PENDING RELEASE ]') + ' Branch master and latest tag are not at the same commit ID');
                    repoLog.branches.push('        Last commit on master@' + masterBranch.packageJson.version + ': : ' + _formatCommitMessage(masterBranch.commit));
                    repoLog.branches.push('        Last commit on develop@' + developBranch.packageJson.version + ': : ' + _formatCommitMessage(developBranch.commit));
                    repoLog.branches.push('        Last commit on tag ' + tags[0].name + ': ' + _formatCommitMessage(tags[0].commit));
                }

            }
            else if (tags.length && masterBranch.commit.id === tags[0].commit.id) {

                repoLog.branches.push($colors.yellow('    [ STABLE ]') + ' Branch master and latest tag at ' + tags[0].name);

            }
            else if (tags.length) {

                repoLog.branches.push($colors.red('    [ UNALIGNED ]') + ' Branches master/develop and latest tag all at different commits');
                repoLog.branches.push('        Last commit on master@' + masterBranch.packageJson.version + ': : ' + _formatCommitMessage(masterBranch.commit));
                repoLog.branches.push('        Last commit on develop@' + developBranch.packageJson.version + ': : ' + _formatCommitMessage(developBranch.commit));
                repoLog.branches.push('        Last commit on tag ' + tags[0].name + ': ' + _formatCommitMessage(tags[0].commit));

            }

        }


        if (repoLog.shouldLog) {

            console.log();
            console.log(repoLog.repo);

            repoLog.branches.forEach(function (log) {
                console.log(log);
            });

            if (repoLog.otherBranches.length) {

                console.log();
                // console.log('    Open branches:');
                repoLog.otherBranches.forEach(function (log) {
                    console.log(log);
                });
            }


            repoLog.tags.forEach(function (log) {
                console.log(log);
            });

            if (repoLog.mergeRequests.length) {

                console.log();
                // console.log('    Merge Requests:');
                repoLog.mergeRequests.forEach(function (log) {
                    console.log(log);
                });
            }

        }

    });

}

function _formatCommitMessage (commit) {

    return commit.message.split('\n')[0].replace(/(^\s*|\s*$)/g, '') + $colors.grey(' (' + commit.id.substring(0, 8) + ')');

}
