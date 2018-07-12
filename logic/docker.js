/*
All docker business logic goes here.
 */

const dockerService = require('../services/docker.js');
const bashService = require('../services/bash.js');
const diskLogic = require('../logic/disk.js');

var _ = require('underscore');
var q = require('q');

const WORKING_DIR = '/usr/local/current-app-yaml';

function up(options) {

  const env = options.env || null;
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  bashService.up({ cwd: WORKING_DIR, log: true, env: env })
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
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
 * Public
 * Return a docker volume object.
 * @param volumeName
 * @returns {Volume}
 */
function getVolume(volumeName) {
  return dockerService.getVolume(volumeName);
}

/**
 * Public
 * Return information about all docker volumes.
 * @param volumeName
 * @returns {Volume}
 */
function getVolumes() {
  return dockerService.getVolumes();
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
 * Removes the given object from docker.
 * @param dockerObject
 * @returns {*}
 */
function remove(dockerObject) {
  return dockerObject.remove();
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

/**
 * Removes the given image from docker.
 * @param imageName
 * @returns {*}
 */
function removeImage(imageName) {
  return dockerService.getImageByName(imageName).remove();
}

/**
 * Removes the docker volume with the given name.
 * @param volumeName
 * @returns {Request|*|PromiseLike<T>|Promise<T>}
 */
function removeVolume(volumeName) {
  return getVolume(volumeName)
    .then(remove);
}

function pullImage(imageName) {
  return dockerService.pullImage(imageName);
}

function createVolume(volumeName) {
  return dockerService.createVolume(volumeName);
}

module.exports = {
  getAllContainers: getAllContainers,
  getContainer: getContainer,
  getCurrentComposeFileImageName: getCurrentComposeFileImageName,
  getInstalledComposeFileImageName: getInstalledComposeFileImageName,
  getRunningContainers: getRunningContainers,
  getVolume: getVolume,
  getVolumes: getVolumes,
  pullImage: pullImage,
  removeContainer: removeContainer,
  removeImage: removeImage,
  removeVolume: removeVolume,
  createVolume: createVolume,
  stop: stop,
  up: up
};