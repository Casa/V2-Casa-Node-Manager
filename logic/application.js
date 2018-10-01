var q = require('q'); // eslint-disable-line id-length

const dockerComposeLogic = require('logic/docker-compose.js');
const dockerLogic = require('logic/docker.js');
const diskLogic = require('logic/disk.js');
const constants = require('utils/const.js');
const errors = require('models/errors.js');
const NodeError = errors.NodeError;
const bashService = require('services/bash.js');
let autoImagePullInterval = {};
const systemResetStatus = {};

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

async function getSerial() {
  return constants.SERIAL;
}

async function getSystemResetStatus() {
  return systemResetStatus;
}

// The raspberry pi 3b+ has 4 processors that run at 100% each. Every hour there are 60 minutes and four processors for
// a total of 240 processor minutes.
//
// If there are no images available, this function will complete in 30 seconds while only using 40% cpu. This equates
// to 0.2 cpu-minutes or 0.08% of the hourly processing minutes available.
//
// Pulling an image typically uses 100%-120% and takes several minutes. We will have to monitor the number of updates
// we release to make sure it does not put over load the pi.
async function startAutoImagePull() {
  autoImagePullInterval = setInterval(dockerComposeLogic.dockerComposePullAll, constants.TIME.ONE_HOUR_IN_MILLIS);
}

// Run startup functions
async function startup() {
  await createSettingsFile();
  await dockerComposeLogic.dockerLoginCasaworker();
  await startSpaceFleet();
  await startAutoImagePull(); // handles docker logout
}

// Set the host device-host and restart space-fleet
async function startSpaceFleet() {
  await runDeviceHost();
  await dockerComposeLogic.dockerComposeUpSingleService({service: 'space-fleet'});
}

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

// Stops all services and removes artifacts that aren't labeled with 'casa=persist'.
// Remove docker images and pull then again if factory reset.
async function reset(factoryReset) {
  try {
    systemResetStatus.resetting = true;
    systemResetStatus.error = false;
    clearInterval(autoImagePullInterval);
    await dockerLogic.stopNonPersistentContainers();
    await dockerLogic.pruneContainers();
    await dockerLogic.pruneNetworks();
    await dockerLogic.pruneVolumes();
    await wipeSettingsVolume();

    if (factoryReset) {
      await dockerLogic.pruneImages();
      await dockerComposeLogic.dockerComposePullAll();
    }
    await createSettingsFile();
    await dockerComposeLogic.dockerComposeUp({service: constants.SERVICES.BITCOIND});
    await dockerComposeLogic.dockerComposeUp({service: constants.SERVICES.LOGSPOUT});
    await dockerComposeLogic.dockerLoginCasaworker();
    await startSpaceFleet();
    await startAutoImagePull();
    systemResetStatus.error = false;
  } catch (error) {
    systemResetStatus.error = true;
    await startSpaceFleet();
  } finally {
    systemResetStatus.resetting = false;
  }
}

async function runDeviceHost() {
  const options = {
    attached: true,
    service: constants.SERVICES.DEVICE_HOST,
  };

  await dockerComposeLogic.dockerComposePull(options);
  await dockerComposeLogic.dockerComposeUpSingleService(options);
  await dockerComposeLogic.dockerComposeRemove(options);
}

// Stops, removes, and recreates a docker container based on the docker image on device. This can be used to restart a
// container or update a container to the newest image.
async function update(services) {
  for (const service of services) {
    const options = {service: service}; // eslint-disable-line object-shorthand

    await dockerComposeLogic.dockerComposeStop(options);
    await dockerComposeLogic.dockerComposeRemove(options);
    await dockerComposeLogic.dockerComposeUpSingleService(options);
  }
}

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

async function cyclePaperTrail(enabled) {

  const options = {
    service: constants.SERVICES.PAPERTRAIL,
    fileName: constants.COMPOSE_FILES.LOGSPOUT
  };

  if (enabled) {
    await dockerComposeLogic.dockerComposeUpSingleService(options);
  } else {
    await dockerComposeLogic.dockerComposeStop(options);
  }

  // TODO: update settings
}


module.exports = {
  cyclePaperTrail,
  downloadLogs,
  getSerial,
  startup,
  shutdown,
  reset,
  update,
  getSystemResetStatus,
};
