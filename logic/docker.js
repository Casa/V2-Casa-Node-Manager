/*
All docker business logic goes here.
 */

const DockerError = require('models/errors.js').DockerError;
const dockerHubService = require('services/dockerHub.js');

const dockerService = require('services/docker.js');

const constants = require('utils/const.js');
const encryption = require('utils/encryption.js');

const q = require('q'); // eslint-disable-line id-length


function getAllContainers() {
  return dockerService.getContainers(true);
}

function getRunningContainers() {
  return dockerService.getContainers(false);
}

function pruneContainers() {
  return dockerService.pruneContainers();
}

function pruneNetworks() {
  return dockerService.pruneNetworks();
}

function pruneVolumes() {
  return dockerService.pruneVolumes();
}

function getStatuses() {
  // TODO: check if something is missing
  var deferred = q.defer();

  var data = {};

  function parseDiskUsage(df) {
    data['node'] = {
      volumes: df['Volumes'].length,
      containers: df['Containers'].length,
      images: df['Images'].length,
      time: Math.floor(new Date().getTime() / 1000) // eslint-disable-line no-magic-numbers
    };
  }

  function parseContainerInformation(containers) {
    var statuses = [];
    containers.forEach(function(container) {
      statuses.push({
        id: container['Id'],
        service: container['Labels']['com.docker.compose.service'],
        image: container['Image'],
        image_id: container['ImageID'], // eslint-disable-line camelcase
        status: container['State'],
        created: container['Created'],
        message: container['Status'],
      });
    });

    data['containers'] = statuses;
  }

  function handleSuccess() {
    deferred.resolve(data);
  }

  function handleError() {
    deferred.reject(new DockerError('Unable to determine statuses'));
  }

  getAllContainers()
    .then(parseContainerInformation)
    .then(dockerService.getDiskUsage)
    .then(parseDiskUsage)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

// Get the updatable status of an image
async function getVersion(version, image, username, password) {

  try {
    const slashParts = image.split('/');
    const organization = slashParts[0];
    const colonParts = slashParts[1].split(':');
    const repository = colonParts[0];
    const tag = colonParts[1];

    var authToken = await dockerHubService.getAuthenticationToken(organization, repository, username, password);
    var digest = await dockerHubService.getDigest(authToken, organization, repository, tag);

    version.updatable = version.version !== digest;
  } catch (err) {
    version.updatable = false; // updatable should default to false
  }

  return version;
}

// Get the version and updatable status of each running container.
async function getVersions() {
  const calls = [];

  var containers = await getAllContainers();
  const casaworkerUsername = encryption.decryptCasaworker(constants.CASAWORKER_USERNAME_ENCRYPTED);
  const casaworkerPassword = encryption.decryptCasaworker(constants.CASAWORKER_PASSWORD_ENCRYPTED);
  const casabuilderUsername = encryption.decryptCasabuilder(constants.CASABUILDER_USERNAME_ENCRYPTED);
  const casabuilderPassword = encryption.decryptCasabuilder(constants.CASABUILDER_PASSWORD_ENCRYPTED);

  for (const container of containers) {

    var version = {
      service: container['Labels']['com.docker.compose.service'],
      version: container['ImageID'],
    };

    if (version.service.includes('manager')) {
      calls.push(getVersion(version, container['Image'], casabuilderUsername, casabuilderPassword));
    } else {
      calls.push(getVersion(version, container['Image'], casaworkerUsername, casaworkerPassword));
    }
  }

  const updatableStatuses = await Promise.all(calls);

  const result = {};
  updatableStatuses.forEach(function(updatableStatus) {
    result[updatableStatus.service] = {
      version: updatableStatus.version, // is version actually useful to the front end?
      updatable: updatableStatus.updatable
    };
  });

  return result;
}

function getVolumeUsage() {
  var deferred = q.defer();

  function parseVolumeInfo(df) {
    var volumeInfo = [];
    df['Volumes'].forEach(function(volume) {
      volumeInfo.push({
        name: volume['Name'],
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

const getLogs = async() => {
  var logs = [];

  var containers = await getAllContainers();

  for (const container of containers) {
    var containerLog = await dockerService.getContainerLogs(container.Id);

    logs.push({
      container: container['Labels']['com.docker.compose.service'],
      logs: containerLog
    });
  }

  return logs;
};

const stopNonPersistentContainers = async() => { // eslint-disable-line id-length
  var containers = await getRunningContainers();

  for (const container of containers) {
    if (container['Labels']['casa'] === null || container['Labels']['casa'] !== 'persist') {
      try {
        await dockerService.stopContainer(container.Id);
      } catch (error) {
        // There's a race condition, if the container is restarting it will receive a 304.
        // Restart policies can be circumvented.
        await dockerService.removeContainer(container.Id, true);
      }
    }
  }
};

module.exports = {
  getStatuses,
  getVersions,
  getVolumeUsage,
  getLogs,
  stopNonPersistentContainers, // eslint-disable-line id-length
  pruneContainers,
  pruneNetworks,
  pruneVolumes,
};
