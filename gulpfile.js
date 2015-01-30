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
var through = require("through");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var fs = require("fs-extra");
var path = require("path");

var copyToDist = function(filepath) {
  "use strict";
  var filename = path.basename(filepath);
  fs.copy(
    filepath, 
    "./public/dist/" + filename, 
    function(err) { if (err) { throw err; } }
  );
};
gulp.task("copy_client_lib", function() {
  "use strict";
  copyToDist("./bower_components/foundation/css/foundation.css");
  copyToDist("./bower_components/cookies-js/dist/cookies.min.js");
  copyToDist("./bower_components/es6-promise-polyfill/promise.js");
});

var browserifyTarget = function(entry) {
  "use strict";
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
};
gulp.task("build_freedom_stub", function() {
  "use strict";
  browserifyTarget('./src/client/freedom.js');
  return;
});

gulp.task("generate_jsdoc", function() {
  "use strict";
  gulp.src("./src/**/*.js")
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
  /** 
   * return gulp.src(testFiles)
   *   .pipe(karma({
   *     configFile: 'karma.conf.js',
   *     action: 'run'
   *   }))
   *   .on('error', function(err) { 
   *     throw err; 
   *   });
   **/
});


gulp.task("build", [ "copy_client_lib", "build_freedom_stub" ]);
gulp.task("test", [ "lint", "mocha_test" ]);
gulp.task("jsdoc", [ "generate_jsdoc" ]);
gulp.task("default", [ "build", "test" ]);
