Radiatus
========
Radiatus is a web server for applications written on top of [freedom.js](http://freedomjs.org),
built using node.js, express, and freedom-for-node.

## Installation
Install globally on your PATH using the node.js package manager, npm.

```bash
$ npm install -g radiatus
```

## Run
Once installed, `radiatus` can be used to serve any properly declared freedom.js application.

```bash
$ radiatus [freedom.js manifest] -d
```

## Develop
See below for more information on how to write freedom.js applications.

## Debug
Start up a node-inspector server

```bash
$ npm install -g node-inspector
node-inspector
```

Radiatus will spawn 1 process for the web server and 1 process for each (user, freedom.js module) tuple.
For example, 2 users are logged in and your freedom.js application consists of 3 modules,
then there will be 7 node.js processes.

## More information
* [Academic Paper](http://www.cs.washington.edu/education/grad/UW-CSE-13-11-01.PDF)
* [freedom.js](http://freedomjs.org)
* [freedom.js wiki](https://github.com/freedomjs/freedom/wiki)

## License
Apache License, Version 2.0
