/*
All docker business logic goes here.
 */

const dockerService = require('../services/docker.js');
const diskLogic = require('../logic/disk.js');

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

    for(var i = 0; i < containers.length; i++) {
      if(_.contains(containers[i].Names, '/' + name)) {
        deferred.resolve(containers[i]);
        return;
      }
    }

    deferred.reject({
      code: 'CONTAINER_NOT_FOUND',
      text: 'Could not find container with name: ' + name
    });
  }

  dockerService.getAllContainers()
    .then(findContainer);

  return deferred.promise;

}

function getCurrentComposeFileImageName() {
  var deferred = q.defer();

  function handleSuccess(fileContents) {
    try {
      var secondHalf = fileContents.split('image:')[1];
      //clean up edges
      secondHalf = secondHalf.trim();
      //split on whitespace and take the first chunk
      var imageName = secondHalf.split(/(\s+)/)[0];
      deferred.resolve(imageName);
    } catch (error) {
      deferred.reject({
        code: 'COULD_NOT_PARSE_YML',
        text: 'Could not parse the yml file to find the image.'
      })
    }
  }

  function handleError(error) {
    deferred.reject(error);
  }

  diskLogic.readCurrentDockerComposeFile()
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function getRunningContainers() {
  return dockerService.getRunningContainers();
}

function pullImage(imageName) {
  return dockerService.pullImage(imageName);
}

module.exports = {
  composeUp: composeUp,
  getAllContainers: getAllContainers,
  getContainer: getContainer,
  getCurrentComposeFileImageName: getCurrentComposeFileImageName,
  getRunningContainers: getRunningContainers,
  pullImage: pullImage
};