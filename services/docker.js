var Docker = require('dockerode');
var docker = new Docker();
var q = require('q'); // eslint-disable-line id-length
const TAG = require('@utils/const.js').TAG;

function getContainers(all) {
  var deferred = q.defer();

  docker.listContainers({all: all}, function(err, containers) { // eslint-disable-line object-shorthand
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(containers);
    }
  });

  return deferred.promise;
}

function getDiskUsage() {
  var deferred = q.defer();

  docker.df(function(err, df) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(df);
    }
  });

  return deferred.promise;
}

function runAddDeviceHostToEnvContainer() {
  var deferred = q.defer();

  docker.run('casacomputer/device-host:' + TAG, [], process.stdout, {
    HostConfig: {
      Binds: [
        '/usr/local/applications/.env:/usr/local/applications/.env'
      ],
      NetworkMode: 'host'
    }
  }, function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve();
    }
  });

  return deferred.promise;
}

module.exports = {
  getContainers,
  getDiskUsage,
  runAddDeviceHostToEnvContainer,
};
