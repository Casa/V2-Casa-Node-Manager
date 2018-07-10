/*
All docker business logic goes here.
 */

const dockerService = require('../services/docker.js');
const bashService = require('../services/bash.js');
const diskLogic = require('../logic/disk.js');

var _ = require('underscore');
var q = require('q');

const ARCH = 'x86';
const DOCKER_DIR={
  'ARM':'/usr/bin/docker:/usr/bin/docker',
  'x86':'/usr/local/bin/docker:/usr/bin/docker'
};

function up() {

  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  bashService.up({ cwd: '/usr/local/current-app-yaml', log: true })
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

//TODO delete
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

  deferred.resolve(dockerService.getContainer(name));

  return deferred.promise;
  /*
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
  */

}

/**
 * Given the file contents from a yml file. Parse through it and return the image name.
 * @param fileContents
 * @returns {string}
 */
function getImageNameFromComposeFileContents(fileContents) {
  var secondHalf = fileContents.split('image:')[1];
  //clean up edges
  secondHalf = secondHalf.trim();
  //split on whitespace and take the first chunk
  var imageName = secondHalf.split(/(\s+)/)[0];
  return imageName;
}

/**
 * Returns the docker image name that exists in the given compose file. The compose file is located in the install
 * directory.
 * @param fileName
 */
function getInstalledComposeFileImageName(fileName) {
  var deferred = q.defer();

  function handleSuccess(fileContents) {
    try {
      var imageName = getImageNameFromComposeFileContents(fileContents);
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

  diskLogic.readInstalledDockerComposeFile(fileName)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function getCurrentComposeFileImageName() {
  var deferred = q.defer();

  function handleSuccess(fileContents) {
    try {
      var imageName = getImageNameFromComposeFileContents(fileContents);
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

/**
 * Private
 * Stops the given container. Returns a promise.
 * @param container
 * @returns {*}
 */
function stopContainer(container) {
  return container.stop();
}

/**
 * Public
 * Stops a container with the given name. Returns a promise.
 * @param containerName
 */

function stop(containerName) {
  return getContainer(containerName)
    .then(stopContainer);
}

/**
 * Private
 * Removes the given container from docker.
 * @param container
 * @returns {*}
 */
function remove(container) {
  return container.remove();
}

/**
 * Removes the given container from docker.
 * @param containerName
 * @returns {*}
 */

function removeContainer(containerName) {
  return getContainer(containerName)
    .then(remove);
}

function removeImage(imageName) {
  var image = dockerService.getImageByName(imageName)
  var t=  image.remove();
  return t;
}

function removeVolume(volumeName) {
 //return dockerService.removeVolume(volumeName);
  return;
}

function pullImage(imageName) {
  return dockerService.pullImage(imageName);
}

module.exports = {
  composeUp: composeUp,
  getAllContainers: getAllContainers,
  getContainer: getContainer,
  getCurrentComposeFileImageName: getCurrentComposeFileImageName,
  getInstalledComposeFileImageName: getInstalledComposeFileImageName,
  getRunningContainers: getRunningContainers,
  pullImage: pullImage,
  removeContainer: removeContainer,
  removeImage: removeImage,
  removeVolume: removeVolume,
  stop: stop,
  up: up
};