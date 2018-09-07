/*
All docker business logic goes here.
 */
const dockerService = require('@services/docker.js');
const dockerHubService = require('@services/dockerHub.js');
const q = require('q'); // eslint-disable-line id-length
const DockerError = require('@models/errors.js').DockerError;

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

const setDeviceHostEnv = async() => {
  await dockerService.runSetIpInEnvContainer();
};

const getVersions = async() => {
  // TODO: check if something is missing

  var versions = [];

  var containers = await getAllContainers();

  for (const container of containers) {

    var version = {
      service: container['Labels']['com.docker.compose.service'],
      version: container['ImageID'],
    };

    // TODO make this loop async. It takes several seconds as of right now.
    try {
      const image = container['Image'];
      const slashParts = image.split('/');
      const organization = slashParts[0];
      const colonParts = slashParts[1].split(':');
      const repository = colonParts[0];
      const tag = colonParts[1];

      var authToken = await dockerHubService.getAuthenticationToken(organization, repository);
      var digest = await dockerHubService.getDigest(authToken, organization, repository, tag);

      version.updatable = version.version !== digest;
    } catch (err) {
      version.updatable = false; // updatable should default to false
    }

    versions.push(version);
  }

  return versions;
};

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
  setDeviceHostEnv,
};
