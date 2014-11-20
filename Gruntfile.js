module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      grunt: [ 'Gruntfile.js' ],
      src: [ 'config/**/*.js', 'src/**/*.js' ],
      options: { jshintrc: true }
    },
    jsdoc: {
      dist: {
        src: [ 'src/**/*.js' ],
        options: { destination: 'generated/doc' },
      }
    },
    jasmine_node: {
      all: [ 'src/' ]
    },
    clean: [],
    bump: {
      options: {
        files: ['package.json'],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin'
      }
    },
    'npm-publish': {
      options: {
        // list of tasks that are required before publishing
        requires: [],
        // if the workspace is dirty, abort publishing (to avoid publishing local changes)
        abortIfDirty: true,
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-npm');
  grunt.loadNpmTasks('grunt-bump');

  grunt.registerTask('release', function(arg) {
    if (arguments.length === 0) {
      arg = 'patch';
    }
    grunt.task.run([
      'bump:'+arg,
      'npm-publish'
    ]);
  });
  
  // Default tasks.
  grunt.registerTask('build', [
    'jshint',
  ]);
  grunt.registerTask('test', [
    'jasmine_node',
  ]);
  
  grunt.registerTask('default', ['build', 'test']);
};
