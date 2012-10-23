# grunt-ftp-deploy

This is a [grunt](https://github.com/gruntjs/grunt) task for code deployment over the _ftp_ protocol.

These days _git_ is not only our goto code management tool but in many cases our deployment tool as well. But there are many cases where _git_ is not really fit for deployment:

- we deploy to servers with only _ftp_ access
- the production code is a result of a build process producing files that we do not necessarily track with _git_

This is why a _grunt_ task like this would be very useful.

For simplicity purposes this task avoids deleting any files and it is not trying to do any size or time stamp comparison. It simply transfers all the files (and folder structure) from your dev location to a location on your server.

## Usage

To use this task you will need to include the following configuration in your _grunt_ file:

```javascript
ftp-deploy: {
  build: {
    auth: {
      host: 'server.com',
      port: 21,
      user: 'myUserName'
    },
    src: 'build',
    dest: '/path/to/destination/folder'
  }
}
```

and load the task:

```javascript
grunt.loadNpmTasks('grunt-ftp-deploy');
```

The parameters in our configuration are:

- **host** - the name or the IP address of the server we are deploying to
- **port** - the port that the _ftp_ service is running on
- **user** - the username we authenticate ourselves with
- **src** - the source location, the local folder that we are transferring to the server
- **dest** - the destination location, the folder on the server we are deploying to

## Password management

There are two ways we can provide the password for the _ftp_ authentication:

- as an optional argument to the task
- stored in a text file named `.ftppass`

The first method takes precedence over the second one.

## Dependencies

This task is built by taking advantage of the great work of Sergi Mansilla and his [jsftp](https://github.com/sergi/jsftp) _node.js_ module.

