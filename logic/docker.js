/*
All docker business logic goes here.
 */

const dockerService = require('../services/docker.js');

var _ = require('underscore');
var q = require('q');

const ARCH = 'x86';
const DOCKER_DIR={
  'ARM':'/usr/bin/docker:/usr/bin/docker',
  'x86':'/usr/local/bin/docker:/usr/bin/docker'
};

function composeUp() {

  const image = 'casacomputer/docker-compose:' + ARCH;
  const binds = ['/var/run/docker.sock:/var/run/docker.sock',
    DOCKER_DIR[ARCH],
    '/usr/local/current-app-yaml:/usr/local/current-app-yaml'
  ];
  const workingDir = '/usr/local/current-app-yaml';

  return dockerService.composeUp(image, binds, workingDir);
}

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
  composeUp: composeUp,
  getAllContainers: getAllContainers,
  getContainer: getContainer,
  getRunningContainers: getRunningContainers
};