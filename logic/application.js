var q = require('q'); // eslint-disable-line id-length

const dockerComposeLogic = require('@logic/docker-compose.js');
const dockerLogic = require('@logic/docker.js');
const diskLogic = require('@logic/disk.js');
const constants = require('@utils/const.js');
const errors = require('@models/errors.js');
const NodeError = errors.NodeError;
const bashService = require('@services/bash.js');
const lnapiService = require('@services/lnapi.js');

function createSettingsFile() {
  const defaultConfig = {
    bitcoind: {
      bitcoinNetwork: 'testnet',
      bitcoindListen: true,
    },
    lnd: {
      chain: 'bitcoin',
      backend: 'bitcoind',
      lndNetwork: 'testnet',
      autopilot: false, // eslint-disable-line object-shorthand
    },
    node: {
      remoteLogging: false
    }
  };

  if (!diskLogic.settingsFileExists()) {
    diskLogic.writeSettingsFile(JSON.stringify(defaultConfig));
  }
}

// Set the host device-host and restart space-fleet
const startSpaceFleet = async() => {
  // await dockerLogic.setDeviceHostEnv();
  await dockerComposeLogic.dockerComposeUpSingleService({service: 'space-fleet'});
};

function shutdown() {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve({shutdown: true});
  }

  function handleError(error) {
    deferred.reject(new NodeError('Unable to shutdown device', error));
  }

  bashService.exec('sudo', ['shutdown'], {})
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function reset() {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(new NodeError('Unable to reset device', error));
  }

  dockerLogic.stopNonPersistentContainers()
    .then(dockerLogic.pruneContainers)
    .then(dockerLogic.pruneNetworks)
    .then(dockerLogic.pruneVolumes)
    .then(wipeSettingsVolume)
    .then(createSettingsFile)
    .then(startSpaceFleet)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

const update = async services => {
  for (const service of services) {
    const options = {service: service}; // eslint-disable-line object-shorthand

    if (constants.LOGGING_SERVICES.includes(service)) {
      options.fileName = constants.LOGGING_DOCKER_COMPOSE_FILE;
    }

    await dockerComposeLogic.dockerComposePull(options);
    await dockerComposeLogic.dockerComposeStop(options);
    await dockerComposeLogic.dockerComposeRemove(options);
    await dockerComposeLogic.dockerComposeUpSingleService(options);
  }
};

function wipeSettingsVolume() {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  var options = {
    cwd: '/settings',
  };

  bashService.exec('rm', ['-f', 'settings.json', 'user.json'], options)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function downloadLogs() {
  var deferred = q.defer();

  const logArchiveBackupPath = '/backup/' + constants.NODE_LOG_ARCHIVE;
  const logArchiveSavedPath = '/tmp/' + constants.NODE_LOG_ARCHIVE;

  function handleSuccess() {
    deferred.resolve(logArchiveSavedPath);
  }

  function handleError(error) {
    deferred.reject(new NodeError('Unable to download log file', error));
  }

  const backUpCommandOptions = [
    'run',
    '-v', 'node_logs:/logs',
    '-v', '/tmp:/backup',
    'alpine',
    'tar', '-cjf', logArchiveBackupPath, '-C', '/logs', './'
  ];

  bashService.exec('docker', backUpCommandOptions, {})
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function cyclePaperTrail(enabled) {
  const options = {
    service: 'papertrail',
    fileName: 'logspout.yml'
  };

  var deferred = q.defer();

  function injectEnabled() {
    return enabled;
  }

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  if (enabled) {
    dockerComposeLogic.dockerComposeUpSingleService(options)
      .then(injectEnabled)
      .then(lnapiService.updateSettings)
      .then(handleSuccess)
      .catch(handleError);
  } else {
    dockerComposeLogic.dockerComposeStop(options)
      .then(injectEnabled)
      .then(lnapiService.updateSettings)
      .then(handleSuccess)
      .catch(handleError);
  }

  return deferred.promise;
}

module.exports = {
  createSettingsFile,
  cyclePaperTrail,
  downloadLogs,
  startSpaceFleet,
  shutdown,
  reset,
  update,
};
