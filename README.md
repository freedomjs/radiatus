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
Start up a node-inspector server on a specified port.
The following commands allow you to access the developer console at
http://127.0.0.1:8000/debug?port=5858

```bash
$ npm install -g node-inspector
$ node-inspector --web-port=8000
```

Then run your Radiatus application in debug mode.
The following command will setup the V8 debug port to be 5858
for the web server. Each subsequent process / freedom.js module
will open up debug ports on monotonically increasing port numbers from this.

```bash
$ node /usr/local/lib/node_modules/radiatus/app.js --debug=5858 [freedom.js manifest] -d
```

Radiatus will spawn 1 process for the web server and 1 process for each (user, freedom.js module) tuple.
For example if 2 users are logged in and your freedom.js application consists of 3 modules,
then there will be 7 node.js processes, with debug ports listening on [5858-5864]

## More information
* [Academic Paper](http://www.cs.washington.edu/education/grad/UW-CSE-13-11-01.PDF)
* [freedom.js](http://freedomjs.org)
* [freedom.js wiki](https://github.com/freedomjs/freedom/wiki)

## License
Apache License, Version 2.0
