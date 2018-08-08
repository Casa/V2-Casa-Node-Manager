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

module.exports = {
  getContainers,
  getDiskUsage,
};
