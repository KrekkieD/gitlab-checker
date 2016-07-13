# gitlab-checker

Command line utility that uses the gitlab API to check your repo branches and tags.

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

