/**
 * Gruntfile for Radiatus
 * Here are some common tasks:
 *
 * build:
 *  - Run jshint
 * test:
 *  - Run all jasmine tests
 * jsdoc:
 *  - Generate jsdoc documentation
 * release:
 *  - Bump the version, tag the release, and publish to NPM
 **/

module.exports = function(grunt) {
  "use strict";
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    browserify: {
      options: { browserifyOptions: { debug: true } },
      client: {
        files: { "public/dist/freedom.js": [ "src/client/main.js" ] },
        options: {}
      }
    },
    copy: {
      client: {
        src: [
          "bower_components/foundation/css/foundation.css",
          "bower_components/cookies-js/dist/cookies.min.js",
          "bower_components/es6-promise-polyfill/promise.js",
        ],
        dest: "public/dist/",
        expand: true, 
        flatten: true,
        filter: 'isFile'
      }
    },
    jshint: {
      app: [ "*.js", "*.json" ],
      src: [ "config/**/*", "src/**/*.js" ],
      options: { jshintrc: true }
    },
    jsdoc: {
      dist: {
        src: [ "src/**/*.js" ],
        options: { destination: "build/doc" },
      }
    },
    jasmine_node: {
      all: [ "src/" ]
    },
    clean: [],
    prompt: { tagMessage: { options: { questions: [
      {
        config: "bump.options.tagMessage",
        type: "input",
        message: "Enter a git tag message:",
        default: "v%VERSION%",
      }
    ]}}},
    bump: {
      options: {
        files: ["package.json", "bower.json"],
        commit: true,
        commitMessage: "Release v%VERSION%",
        commitFiles: ["package.json", "bower.json"],
        createTag: true,
        tagName: "v%VERSION%",
        tagMessage: "Version %VERSION%",
        push: true,
        pushTo: "origin"
      }
    },
    "npm-publish": {
      options: {
        requires: [],
        abortIfDirty: true,
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks("grunt-jasmine-node");
  grunt.loadNpmTasks("grunt-jsdoc");
  grunt.loadNpmTasks("grunt-prompt");
  grunt.loadNpmTasks("grunt-npm");
  grunt.loadNpmTasks("grunt-bump");

  grunt.registerTask("release", function(arg) {
    if (arguments.length === 0) {
      arg = "patch";
    }
    grunt.task.run([
      "build",
      "test",
      "prompt:tagMessage",
      "bump:"+arg,
      "npm-publish"
    ]);
  });
  
  // Default tasks.
  grunt.registerTask("build", [
    "copy:client",
    "browserify:client"
  ]);
  grunt.registerTask("test", [
    "jshint",
    "jasmine_node",
  ]);
  
  grunt.registerTask("default", ["build", "test"]);
};
