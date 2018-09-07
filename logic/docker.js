/*
All docker business logic goes here.
 */
const dockerService = require('@services/docker.js');
const dockerHubService = require('@services/dockerHub.js');
const q = require('q'); // eslint-disable-line id-length
const DockerError = require('@models/errors.js').DockerError;


function getAllContainers() {
  return dockerService.getContainers(true);
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

module.exports = {
  getStatuses,
  getVersions,
  getVolumeUsage,
  getLogs,
};
