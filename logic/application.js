const dockerComposeLogic = require('logic/docker-compose.js');
const dockerLogic = require('logic/docker.js');
const diskLogic = require('logic/disk.js');
const constants = require('utils/const.js');
const bashService = require('services/bash.js');
const LNNodeError = require('models/errors.js').NodeError;
const schemaValidator = require('utils/settingsSchema.js');
const md5Check = require('md5-file');
const UUID = require('utils/UUID.js');
const auth = require('logic/auth');

let autoImagePullInterval = {};
const systemStatus = {};
const logArchiveLocalPath = constants.WORKING_DIRECTORY + '/' + constants.NODE_LOG_ARCHIVE;
const logArchiveLocalPathTemp = constants.WORKING_DIRECTORY + '/' + constants.NODE_LOG_ARCHIVE_TEMP;

// Checks whether the settings.json file exists, and attempts to create it with default value should it not.
async function settingsFileIntegrityCheck() { // eslint-disable-line id-length
  const defaultConfig = {
    bitcoind: {
      bitcoinNetwork: 'mainnet',
      bitcoindListen: true,
    },
    lnd: {
      chain: 'bitcoin',
      backend: 'bitcoind',
      lndNetwork: 'mainnet',
      autopilot: false, // eslint-disable-line object-shorthand
    }
  };

  const exists = await diskLogic.settingsFileExists();
  if (!exists) {
    const validation = schemaValidator.validateSettingsSchema(defaultConfig);
    if (!validation.valid) {
      return new LNNodeError(validation.errors);
    }
    await diskLogic.writeSettingsFile(defaultConfig);
  }
}

async function generateRPCCredentials() {
  constants.RPC_USER = UUID.create();
  constants.RPC_PASSWORD = UUID.create();
}

// Return the serial id of the device.
async function getSerial() {
  return constants.SERIAL;
}

// Return info device reset state, in-progress and/or it has encountered errors.
async function getSystemStatus() {
  return systemStatus;
}

// Save system settings
async function saveSettings(config) {
  const versions = await dockerLogic.getVersions();

  // Save settings currently performs a docker compose up. This will recreate the container with the new image. We
  // don't want the user to accidentally be updating their system when they are trying to save settings. Therefore, if
  // a new image exists, we will block the user from saving until they actively choose to update their system.
  if (versions.bitcoind.updatable) {
    throw new LNNodeError('Bitcoin needs to be updated before settings can be saved');
  }
  if (versions.lnd.updatable) {
    throw new LNNodeError('Lightning needs to be updated before settings can be saved');
  }

  const currentConfig = await diskLogic.readSettingsFile();

  const restartBitcoind = JSON.stringify(currentConfig.bitcoind) !== JSON.stringify(config.bitcoind);
  const restartLnd = JSON.stringify(currentConfig.lnd) !== JSON.stringify(config.lnd);

  await diskLogic.writeSettingsFile(config);

  if (restartBitcoind) {
    await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.BITCOIND});
  }
  if (restartLnd) {
    await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.LND});
  }
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
  // initial setup after a reset or manufacture, force an update.
  const firstBoot = await auth.isRegistered();
  if (!firstBoot.registered) {
    await dockerComposeLogic.dockerLoginCasaworker();
    await dockerComposeLogic.dockerComposePull({service: constants.SERVICES.WELCOME});
    await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.WELCOME});
    await dockerComposeLogic.dockerComposePullAll();
    await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.WELCOME});
  }

  await settingsFileIntegrityCheck();

  // // TODO: remove before release, this prevents the manager from overriding local changes to YMLs.
  if (process.env.DISABLE_YML_UPDATE !== 'true') {
    await checkYMLs();
  }
  await generateRPCCredentials();
  await startSpaceFleet();
  await dockerComposeLogic.dockerComposeUp({service: constants.SERVICES.BITCOIND}); // Launching all services
  await dockerComposeLogic.dockerComposeUp({service: constants.SERVICES.LOGSPOUT}); // Launching all services
  await startAutoImagePull(); // handles docker logout
}

// Set the host device-host and restart space-fleet
async function startSpaceFleet() {
  await dockerComposeLogic.dockerLoginCasaworker();
  await runDeviceHost();
  await dockerComposeLogic.dockerComposeUpSingleService({service: 'space-fleet'});
}

// Stops all services and removes artifacts that aren't labeled with 'casa=persist'.
// Remove docker images and pull then again if factory reset.
async function reset(factoryReset) {
  try {
    systemStatus.resetting = true;
    systemStatus.error = false;
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
    await settingsFileIntegrityCheck();
    await startSpaceFleet();
    await dockerComposeLogic.dockerComposeUp({service: constants.SERVICES.BITCOIND}); // Launching all services
    await dockerComposeLogic.dockerComposeUp({service: constants.SERVICES.LOGSPOUT}); // Launching all services
    await startAutoImagePull();
    systemStatus.error = false;
  } catch (error) {
    systemStatus.error = true;
    await startSpaceFleet();
  } finally {
    systemStatus.resetting = false;
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
  const logArchiveBackupPath = '/backup/' + constants.NODE_LOG_ARCHIVE_TEMP;

  const backUpCommandOptions = [
    'run',
    '--rm',
    '-v', 'applications_logs:/logs',
    '-v', constants.WORKING_DIRECTORY.concat(':/backup'),
    'alpine',
    'tar', '-cjf', logArchiveBackupPath, '-C', '/logs', './'
  ];

  await bashService.exec('docker', backUpCommandOptions, {});

  const gpgCommandOptions = [
    '--batch', '--yes', // allow overwriting.
    '--output', logArchiveLocalPath,
    '-r', constants.NODE_LOG_ARCHIVE_GPG_RECIPIENT,
    '--trust-model', 'always', // TODO: Can we register our GPG public key with some CA?
    '--encrypt', logArchiveLocalPathTemp
  ];

  await bashService.exec('gpg', gpgCommandOptions, {});

  return logArchiveLocalPath;
}

// Remove log archive.
function deleteLogArchives() {
  const options = {
    cwd: constants.WORKING_DIRECTORY
  };

  bashService.exec('rm', ['-f', logArchiveLocalPath, logArchiveLocalPathTemp], options);
}

// Compare known compose files, except manager.yml, with on-device YMLs.
// The manager should have the latest YMLs.
async function checkYMLs() {
  const knownYMLs = Object.assign({}, constants.COMPOSE_FILES);
  delete knownYMLs.MANAGER;
  delete knownYMLs.WELCOME;

  const updatableYMLs = Object.values(knownYMLs);

  const outdatedYMLs = [];

  for (const knownYMLFile of updatableYMLs) {
    try {
      const canonicalMd5 = md5Check.sync(constants.CANONICAL_YML_DIRECTORY.concat('/' + knownYMLFile));
      const ondeviceMd5 = md5Check.sync(constants.WORKING_DIRECTORY.concat('/' + knownYMLFile));

      if (canonicalMd5 !== ondeviceMd5) {
        outdatedYMLs.push(knownYMLFile);
      }
    } catch (error) {
      outdatedYMLs.push(knownYMLFile);
    }
  }

  if (outdatedYMLs.length !== 0) {
    await updateYMLs(outdatedYMLs);
  }
}

// Stop non-persistent containers, and copy over outdated YMLs, restart services.
// Declared services could be different between the YMLs, so stop everything.
// Might need to disable for AWS instances with <4 CPUs as we dynamically configure CPU resources.
async function updateYMLs(outdatedYMLs) {
  try {
    systemStatus.updating = true;
    await dockerLogic.stopNonPersistentContainers();
    await dockerLogic.pruneContainers();

    for (const outdatedYML of outdatedYMLs) {
      const ymlFile = constants.CANONICAL_YML_DIRECTORY + '/' + outdatedYML;
      await bashService.exec('cp', [ymlFile, constants.WORKING_DIRECTORY], {});
    }

    clearInterval(autoImagePullInterval);
    await dockerComposeLogic.dockerComposePullAll();
    await startAutoImagePull();
    systemStatus.error = false;
  } catch (error) {
    systemStatus.error = true;
  } finally {
    systemStatus.updating = false;
  }
}

module.exports = {
  downloadLogs,
  deleteLogArchives,
  getSerial,
  saveSettings,
  startup,
  reset,
  update,
  getSystemStatus,
};
