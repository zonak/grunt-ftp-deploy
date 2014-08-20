'use strict';
module.exports = function (grunt) {
  grunt.initConfig({
    'ftp-deploy': {
      build: {
        auth: {
          host: 'localhost',
          port: 4000,
          authKey: 'key1',
          authPath: './test/.ftpconfig'
        },
        src: './test/fixtures/',
        dest: './test/tmp'
      }
    },
    simplemocha: {
      test: {
        src: './test/test.js'
      }
    },
    clean: {
      test: ['test/tmp']
    }
  });

  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-simple-mocha');

  var mockServer;
  grunt.registerTask('pre', function () {
    var Server = require('ftp-test-server');

    mockServer = new Server();

    mockServer.init({
      user: 'test',
      pass: 'test',
      port: 4000
    });

    mockServer.on('stdout', process.stdout.write.bind(process.stdout));
    mockServer.on('stderr', process.stderr.write.bind(process.stderr));

    setTimeout(this.async(), 500);
  });

  grunt.registerTask('post', function () {
    mockServer.stop();
  });

  grunt.registerTask('default', [
    'clean',
    'pre',
    'ftp-deploy',
    'simplemocha',
    'post',
    'clean'
  ]);
};
