# gitlab-checker

Command line utility that uses the gitlab API to check your repo branches and tags.

## What?

The gitlab-checker utility looks for all your **starred** repositories on the gitlab host. It filters out any projects you do not have write access to. It's gonna retrieve all branches, tags, and open merge requests. For each branch it finds, it will extract the version from the file `package.json`.

Once it has fetched all info, it will evaluate the details. The `#master` and `#develop` branch get special treatment, they represent your `stable` and `unstable` branches. Any other branches are treated as feature branches (or bugfix branches, it doesn't matter).

It may conclude the following:

- `clean`: This means `#master`, `#develop` and the latest tag are at the same `commitId`. Apart from feature branches, there are no changes that have not been released (tagged).
- `pending release`: The `#master` and `#develop` branch are at the same `commitId`, but the latest tag is not at this `commitId`. There are no changes, but since there is no tag yet a release is still pending.
- `stable`: The `#master` branch and latest tag are at the same `commitId`.
- `unstable`: Code is present in `#develop` that is not yet merged to `#master`. Development is in progress, but since the changes are not merged to `#master` it is not yet being released.
- `unaligned`: Everything is different. The latest tag is at a different `commitId` than `#master`, and `#master` is at a different `commitId` than `#develop`. This state should only occur during heavy developments (i.e. pushes to `#develop`) while a release is being created (which means tagging `#master` and thus aligning the `commitId` of the tag and `#master`).

Next to this, it will show you the current list of branches, any open merge requests, and will list the current version from `package.json`.

## Installing

For convenience, install it globally, but it's not required. Settings are saved per installation (i.e. a global install will have a globally stored config, a local install wil have a locally stored config).

```bash
# global
$ npm install -g gitlab-checker

# local
$ npm install gitlab-checker
```

## Usage

It'll ask for your details on first run and provide you the option to save them. 

Note that there's no encryption going on, things are saved in plaintext within the module folder.

You can get your gitlab token from your gitlab account (see `/profile/account` on your gitlab host). 

```bash
$ gitlab-checker

# which results in:
prompt: Enter the Gitlab host (including protocol):  https://your.gitlab.host
prompt: Provide your private token:  YOURGITLABPRIVATETOKEN
prompt: Store repo configuration? (y/n):  y
```

### Options

- `--help`: Shows a quick readme
- `--clearConfig`: removes stored config
