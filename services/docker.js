var Docker = require('dockerode');
var docker = new Docker();
var q = require('q'); // eslint-disable-line id-length

function getContainers(all) {
  var deferred = q.defer();

  docker.listContainers({all: all}, function(error, containers) { // eslint-disable-line object-shorthand
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(containers);
    }
  });

  return deferred.promise;
}

function getDiskUsage() {
  var deferred = q.defer();

  docker.df(function(error, df) {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(df);
    }
  });

  return deferred.promise;
}

function getContainerLogs(containerId) {
  var deferred = q.defer();

  var container = docker.getContainer(containerId);

  container.logs({tail: 100, stdout: true, stderr: true}, function(error, logs) {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(logs.replace(/\0/g, ''));
    }
  });

  return deferred.promise;
}

module.exports = {
  getContainers,
  getDiskUsage,
  getContainerLogs,
};
