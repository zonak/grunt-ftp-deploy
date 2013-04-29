//
// Grunt Task File
// ---------------
//
// Task: FTP Deploy
// Description: Deploy code over FTP
// Dependencies: jsftp
//

module.exports = function(grunt) {

  grunt.util = grunt.util || grunt.utils;

  var async = grunt.util.async;
  var log = grunt.log;
  var _ = grunt.util._;
  var file = grunt.file;
  var fs = require('fs');
  var path = require('path');
  var Ftp = require('jsftp');

  var toTransfer;
  var ftp;
  var localRoot;
  var remoteRoot;
  var currPath;
  var authVals;
  var exclusions;

  // A method for parsing the source location and storing the information into a suitably formated object
  function dirParseSync(startDir, result) {
    var files;
    var i;
    var tmpPath;
    var currFile;

    // initialize the `result` object if it is the first iteration
    if (result === undefined) {
      result = {};
      result[path.sep] = [];
    }

    // check if `startDir` is a valid location
    if (!fs.existsSync(startDir)) {
      grunt.warn(startDir + ' is not an existing location');
    }

    // iterate throught the contents of the `startDir` location of the current iteration
    files = fs.readdirSync(startDir);
    for (i = 0; i < files.length; i++) {
      currFile = startDir + path.sep + files[i];
      if (!file.isMatch(exclusions, currFile)) {
        if (file.isDir(currFile)) {
          tmpPath = path.relative(localRoot, startDir + path.sep + files[i]);
          if (!_.has(result, tmpPath)) {
            result[tmpPath] = [];
          }
          dirParseSync(startDir + path.sep + files[i], result);
        } else {
          tmpPath = path.relative(localRoot, startDir);
          if (!tmpPath.length) {
            tmpPath = path.sep;
          }
          result[tmpPath].push(files[i]);
        }
      }
    }

    return result;
  }

  // A method for changing the remote working directory and creating one if it doesn't already exist
  function ftpCwd(inPath, cb) {
    ftp.raw.cwd(inPath, function(err) {
      if(err){
        ftp.raw.mkd(inPath, function(err) {
          if(err) {
            log.error('Error creating new remote folder ' + inPath + ' --> ' + err);
            cb(err);
          } else {
            log.ok('New remote folder created ' + inPath.yellow);
            ftpCwd(inPath, cb);
          }
        });
      } else {
        cb(null);
      }
    });
  }

  // A method for uploading a single file
  function ftpPut(inFilename, cb) {
    var fileData = fs.readFileSync(localRoot + path.sep + currPath + path.sep + inFilename);

    ftp.put(inFilename, fileData, function(err) {
      if(err) {
        log.error('Cannot upload file: ' + inFilename + ' --> ' + err);
        cb(err);
      } else {
        log.ok('Uploaded file: ' + inFilename.green + ' to: ' + currPath.yellow);
        cb(null);
      }
    });
  }

  // A method that processes a location - changes to a fodler and uploads all respective files
  function ftpProcessLocation (inPath, cb) {
    if (!toTransfer[inPath]) {
      cb(new Error('Data for ' + inPath + ' not found'));
    }

    ftpCwd('/'+remoteRoot + '/' + inPath.replace(/\\/gi, '/'), function (err) {
      var files;

      if (err) {
        grunt.warn('Could not switch to remote folder!');
      }

      currPath = inPath;
      files = toTransfer[inPath];

      async.forEach(files, ftpPut, function (err) {
        if (err) {
          grunt.warn('Failed uploading files!');
        }
        cb(null);
      });
    });
  }

  function getAuthByKey (inKey) {
    var tmpStr;
    var retVal = null;

    if (fs.existsSync('.ftppass')) {
      tmpStr = grunt.file.read('.ftppass');
      if (inKey != null && tmpStr.length) retVal = JSON.parse(tmpStr)[inKey];
    }
    return retVal;
  }

  // The main grunt task
  grunt.registerMultiTask('ftp-deploy', 'Deploy code over FTP', function() {
    var done = this.async();

    // Init
    ftp = new Ftp({
      host: this.data.auth.host,
      port: this.data.auth.port
    });

    localRoot = Array.isArray(this.data.src) ? this.data.src[0] : this.data.src;
    remoteRoot = Array.isArray(this.data.dest) ? this.data.dest[0] : this.data.dest;
    authVals = getAuthByKey(this.data.auth.authKey);
    exclusions = this.data.exclusions || [];
    ftp.useList = true;
    toTransfer = dirParseSync(localRoot);

    // Checking if we have all the necessary credentilas before we proceed
    if (authVals == null || authVals.username == null || authVals.password == null) {
      grunt.warn('Username or Password not found!');
    }

    // Authentication and main processing of files
    ftp.auth(authVals.username, authVals.password, function(err) {
      var locations = _.keys(toTransfer);
      if (err) {
        grunt.warn('Authentication ' + err);
      }

      // Iterating through all location from the `localRoot` in parallel
      async.forEachSeries(locations, ftpProcessLocation, function() {
        ftp.raw.quit(function(err) {
          if (err) {
            log.error(err);
          } else {
            log.ok('FTP upload done!');
          }
          done();
        });
      });
    });

    if (grunt.errors) {
      return false;
    }
  });
};
