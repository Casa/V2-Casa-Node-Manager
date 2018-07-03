const dockerService = require('../services/docker.js');

var _ = require('underscore');
var q = require('q');

function getAllContainers() {
  return dockerService.getAllContainers();
}

function getContainer(name) {

  var deferred = q.defer();

  function findContainer(containers) {

    _.each(containers, function(container) {
      if(_.contains(container.Names, '/' + name)) {
        deferred.resolve(container);
        return;
      }
    });

    deferred.reject({
      code: 'CONTAINER_NOT_FOUND',
      text: 'Could not find container with name: ' + name
    });
  }

  dockerService.getAllContainers()
    .then(findContainer);

  return deferred.promise;

}

function getRunningContainers() {
  return dockerService.getRunningContainers();
}

module.exports = {
  getAllContainers: getAllContainers,
  getContainer: getContainer,
  getRunningContainers: getRunningContainers
};