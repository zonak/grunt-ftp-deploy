//
// Grunt Task File
// ---------------
//
// Task: FTP Deploy
// Description: Deploy code over FTP
// Dependencies: jsftp
//

module.exports = function(grunt) {

  var async = grunt.util.async;
  var log = grunt.log;
  var _ = grunt.util._;
  var fs = require('fs');
  var path = require('path');
  var Ftp = require('jsftp');

  var toTransfer;
  var ftp;
  var localRoot;
  var remoteRoot;
  var currPath;
  var user;
  var pass;

  // A method for parsing the source location and storing the information into a suitably formated object
  function dirParseSync(startDir, result) {
    var files;
    var i;
    var tmpPath;
    var currFile;

    // initialize the `result` object if it is the first iteration
    if (result === undefined) {
      result = {'/': []};
    }

    // check if `startDir` is a valid location
    if (!fs.existsSync(startDir)) {
      grunt.warn(startDir + 'is not an existing location');
    }

    // iterate throught the contents of the `startDir` location of the current iteration
    files = fs.readdirSync(startDir);
    for (i = 0; i < files.length; i++) {
      currFile = fs.lstatSync(startDir + path.sep + files[i]);
      if (currFile.isDirectory()) {
        tmpPath = path.relative(localRoot, startDir + path.sep + files[i]);
        if (!_.has(result, tmpPath)) {
          result[tmpPath] = [];
        }
        dirParseSync(startDir + path.sep + files[i], result);
      } else {
        tmpPath = path.relative(localRoot, startDir);
        if (!tmpPath.length) {
          tmpPath = '/';
        }
        result[tmpPath].push(files[i]);
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
    ftp.put(inFilename, grunt.file.read(localRoot + path.sep + currPath + path.sep + inFilename), function(err) {
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

    ftpCwd(remoteRoot + '/' + inPath.replace(/\\/gi, '/'), function (err) {
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

  // The main grunt task
  grunt.registerMultiTask('ftp-deploy', 'Deploy code over FTP', function() {
    var done = this.async();

    // Init
    ftp = new Ftp({
      host: this.data.auth.host,
      port: this.data.auth.port
    });
    localRoot = this.file.src;
    remoteRoot = this.file.dest;
    user = this.data.auth.user;
    pass = null;
    ftp.useList = true;
    toTransfer = dirParseSync(localRoot);

    // If there is a password provided as an argument
    if (this.args.length) {
      pass = this.args[0];
    } else if (fs.existsSync('.ftppass')) { // If there is a `.ftppass` file found in the root of the project get the password from there
      pass = grunt.file.read('.ftppass');
    }

    // Checking if we have all the necessary credentilas before we proceed
    if (user == null || pass == null) {
      grunt.warn('Username or Password not found!');
    }

    // Authentication and main processing of files
    ftp.auth(user, pass, function(err) {
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
