'use strict';
var assert = require('assert');
var grunt = require('grunt');

it('should upload files to an FTP-server', function () {
  assert(grunt.file.exists('./test/tmp/fixture.txt'));
  assert.equal(grunt.file.read('./test/tmp/fixture.txt'), 'Hello World!', 'Uploaded file matches source file');
});