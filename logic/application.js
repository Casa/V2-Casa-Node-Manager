const dockerComposeLogic = require('logic/docker-compose.js');
const dockerLogic = require('logic/docker.js');
const diskLogic = require('logic/disk.js');
const constants = require('utils/const.js');
const bashService = require('services/bash.js');
let autoImagePullInterval = {};
const systemResetStatus = {};
const logArchiveSavedPath = constants.WORKING_DIRECTORY + '/' + constants.NODE_LOG_ARCHIVE;

async function createSettingsFile() {
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

  try {
    await diskLogic.settingsFileExists();
  } catch (error) {
    diskLogic.writeSettingsFile(JSON.stringify(defaultConfig));
  }

}

// Return the serial id of the device.
async function getSerial() {
  return constants.SERIAL;
}

// Return info device reset state, in-progress and/or it has encountered errors.
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
    await wipeAccountsVolume();

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

// Update .env with new host IP.
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

// Remove the user file.
async function wipeAccountsVolume() {
  const options = {
    cwd: '/accounts',
  };

  await bashService.exec('rm', ['-f', 'user.json'], options);
}

// Remove any setting files.
async function wipeSettingsVolume() {
  const options = {
    cwd: '/settings',
  };

  await bashService.exec('rm', ['-f', 'settings.json'], options);
}

// Launch docker container which will tar logs.
async function downloadLogs() {
  const logArchiveBackupPath = '/backup/' + constants.NODE_LOG_ARCHIVE;

  const backUpCommandOptions = [
    'run',
    '--rm',
    '-v', 'applications_logs:/logs',
    '-v', constants.WORKING_DIRECTORY.concat(':/backup'),
    'alpine',
    'tar', '-cjf', logArchiveBackupPath, '-C', '/logs', './'
  ];

  await bashService.exec('docker', backUpCommandOptions, {});

  return logArchiveSavedPath;
}

// Remove log archive.
function deleteLogArchive() {
  const options = {
    cwd: constants.WORKING_DIRECTORY
  };

  bashService.exec('rm', ['-f', logArchiveSavedPath], options);
}

module.exports = {
  downloadLogs,
  deleteLogArchive,
  getSerial,
  startup,
  reset,
  update,
  getSystemResetStatus,
};
