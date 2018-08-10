/*
All docker business logic goes here.
 */
const dockerService = require('@services/docker.js');
var q = require('q'); // eslint-disable-line id-length
const DockerError = require('@resources/errors.js').DockerError;

// TODO: verify counts
const EXPECTED_VOLUME_COUNT = 4;
const EXPECTED_IMAGE_COUNT = 12;
const EXPECTED_CONTAINER_COUNT = 10;

function getAllContainers() {
  return dockerService.getContainers(true);
}

function getStatuses() {
  // TODO: check if something is missing
  var deferred = q.defer();

  function parseContainerInformation(containers) {
    var statuses = [];
    containers.forEach(function(container) {
      statuses.push({
        service: container['Labels']['com.docker.compose.service'],
        status: container['State']
      });
    });

    return statuses;
  }

  function handleSuccess(statuses) {
    deferred.resolve(statuses);
  }

  function handleError() {
    deferred.reject(new DockerError('Unable to determine statuses'));
  }

  getAllContainers()
    .then(parseContainerInformation)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function getVersions() {
  // TODO: check if something is missing
  var deferred = q.defer();

  function parseContainerInformation(containers) {
    var versions = [];
    containers.forEach(function(container) {
      versions.push({
        service: container['Labels']['com.docker.compose.service'],
        version: container['ImageID'],
      });
    });

    return versions;
  }

  function handleSuccess(versions) {
    deferred.resolve(versions);
  }

  function handleError() {
    deferred.reject(new DockerError('Unable to determine versions'));
  }

  getAllContainers()
    .then(parseContainerInformation)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function getVolumeUsage() {
  var deferred = q.defer();

  function parseVolumeInfo(df) {
    var volumeInfo = [];
    df['Volumes'].forEach(function(volume) {
      volumeInfo.push({
        name: volume['Labels']['com.docker.compose.volume'],
        usage: volume['UsageData']['Size']
      });
    });

    return volumeInfo;
  }

  function handleSuccess(volumeInfo) {
    deferred.resolve(volumeInfo);
  }

  function handleError() {
    deferred.reject(new DockerError('Unable to determine volume info'));
  }

  dockerService.getDiskUsage()
    .then(parseVolumeInfo)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function healthcheckHelper(type, expected, actual) {
  var data = {};
  if (actual === expected) {
    data[type] = ['balanced', expected, actual];
  } else if (actual <= expected) {
    data[type] = ['missing', expected, actual];
  } else if (actual >= expected) {
    data[type] = ['extra', expected, actual];
  }

  return data;
}

function getSystemHealth() {
  var deferred = q.defer();

  function parseDiskUsage(df) {
    var systemHealth = [];

    systemHealth.push(healthcheckHelper('volumes', EXPECTED_VOLUME_COUNT, df['Volumes'].length));
    systemHealth.push(healthcheckHelper('containers', EXPECTED_CONTAINER_COUNT, df['Containers'].length));
    systemHealth.push(healthcheckHelper('images', EXPECTED_IMAGE_COUNT, df['Images'].length));

    return systemHealth;
  }

  function handleSuccess(volumeInfo) {
    deferred.resolve(volumeInfo);
  }

  function handleError() {
    deferred.reject(new DockerError('Unable to system health'));
  }

  dockerService.getDiskUsage()
    .then(parseDiskUsage)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

module.exports = {
  getStatuses,
  getVersions,
  getVolumeUsage,
  getSystemHealth,
};
