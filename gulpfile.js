/**
 * gulpfile for Radiatus
 * Here are some common tasks:
 * build:
 *  - Run jshint
 * test:
 *  - Run all jasmine tests
 * jsdoc:
 *  - Generate jsdoc documentation
 * release:
 *  - Bump the version, tag the release, and publish to NPM
 **/

var gulp = require("gulp");
var jshint = require("gulp-jshint");
var jshint_stylish = require("jshint-stylish");
var jsdoc = require("gulp-jsdoc");
var jasmine = require("gulp-jasmine");
var del = require('del');

gulp.task("lint", function() {
  return gulp.src([
    "*.js",
    "*.json",
    "config/**/*", 
    "src/**/*",
  ]).pipe(jshint())
    .pipe(jshint.reporter(jshint_stylish));
});

gulp.task("jsdoc", function() {
  return gulp.src("./src/**/*.js")
    .pipe(jsdoc("./build/doc"));
});

gulp.task("jasmine", function () {
  return gulp.src("src/**/*.spec.js")
    .pipe(jasmine());
});

gulp.task('clean', function (cb) {
  del([
    'build/',
  ], cb);
});

gulp.task("build", ["lint"]);
gulp.task("test", ["jasmine"]);
gulp.task("default", ["build", "test"]);

