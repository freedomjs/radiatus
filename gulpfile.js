/**
 * gulpfile for radiatus
 *
 * Here are the common tasks used:
 * build
 * - Lint and compile
 * - (default Grunt task)
 * test
 *  - Run all tests
 * jsdoc
 *  - Generate jsdoc documentation
 **/
var gulp = require("gulp");
var jshint = require("gulp-jshint");
var jsdoc = require("gulp-jsdoc");
var mocha = require("gulp-mocha");
var through = require("through");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var fs = require("fs-extra");
var path = require("path");

gulp.task("copy_client_lib", function() {
  "use strict";
  var copyToDist = function(filepath) {
    fs.copy(
      filepath, 
      "./public/dist/" + path.basename(filepath), 
      function(err) { if (err) { throw err; } }
    );
  };
  copyToDist("./bower_components/foundation/css/foundation.css");
  copyToDist("./bower_components/cookies-js/dist/cookies.min.js");
  copyToDist("./bower_components/es6-promise-polyfill/promise.js");
});

gulp.task("build_freedom_stub", function() {
  "use strict";
  var entry = "./src/client/freedom.js";
  var filename = path.basename(entry);
  var bundler = browserify({
    entries: [ entry ],
    debug: true
  });
  var bundle = function() {
    return bundler
      .bundle()
      .pipe(source(filename))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      // Add transformation tasks to the pipeline here.
      .pipe(uglify())
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./public/dist/'));
  };
  return bundle();
});

gulp.task("generate_jsdoc", function() {
  "use strict";
  return gulp.src("./src/**/*.js")
    .pipe(jsdoc("./build/doc"));
});

gulp.task("lint", function() {
  "use strict";
  return gulp.src([
      "*.js",
      "*.json",
      "config/**/*",
      "src/**/*.js"
    ]).pipe(jshint({ lookup: true }))
    .pipe(jshint.reporter("default"));
});

gulp.task("mocha_test", function() {
  "use strict";
  return gulp.src("./src/**/*.spec.js")
    .pipe(mocha({ reporter: "spec" }));
});

gulp.task("build", [ "copy_client_lib", "build_freedom_stub" ]);
gulp.task("test", [ "lint", "mocha_test" ]);
gulp.task("jsdoc", [ "generate_jsdoc" ]);
gulp.task("default", [ "build", "test" ]);
