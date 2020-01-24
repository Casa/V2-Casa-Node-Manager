/* eslint-disable max-lines */

const authLogic = require('logic/auth.js');
const dockerComposeLogic = require('logic/docker-compose.js');
const dockerLogic = require('logic/docker.js');
const diskLogic = require('logic/disk.js');
const git = require('logic/git.js');
const constants = require('utils/const.js');
const bashService = require('services/bash.js');
const dockerHubService = require('services/dockerHub.js');
const lnapiService = require('services/lnapi.js');
const LNNodeError = require('models/errors.js').NodeError;
const DockerPullingError = require('models/errors.js').DockerPullingError;
const schemaValidator = require('utils/settingsSchema.js');
const ipAddressUtil = require('utils/ipAddress.js');
const logger = require('utils/logger.js');
const UUID = require('utils/UUID.js');

const semver = require('semver');
const md5Check = require('md5-file');

let lanIPManagementInterval = {};
let ipManagementRunning = false;

let lndManagementInterval = {};
let lndManagementRunning = false;

let restartLndInterval = {};
let restartLndRunning = false;

const RETRY_SECONDS = 10;
const RETRY_ATTEMPTS = 10;

let updatingArtifactsInterval = {};
let updatingBuildArtifacts = false; // is the manager currently updating build artifacts

let invalidDigestDetected = false;

let systemStatus;
let bootPercent = 0; // An approximate state of where the manager is during boot.
resetSystemStatus();

// Get all ip or onion address that can be used to connect to this Casa node.
async function getAddresses() {

  // Get ip address.
  const addresses = [ipAddressUtil.getLanIPAddress()];

  // Check to see if tor is turned on.
  if (process.env.CASA_NODE_HIDDEN_SERVICE) {
    addresses.push(process.env.CASA_NODE_HIDDEN_SERVICE);
  }

  return addresses;
}

async function getBootPercent() {
  return bootPercent;
}

function resetSystemStatus() {
  systemStatus = {};
}

// Checks whether the settings.json file exists, and attempts to create it with default value should it not. Returns
// the settings.
async function settingsFileIntegrityCheck() { // eslint-disable-line id-length
  const defaultConfig = {
    bitcoind: {
      bitcoinNetwork: 'mainnet',
      bitcoindListen: true,
      bitcoindTor: true, // Added February 2019
    },
    lnd: {
      chain: 'bitcoin',
      backend: 'bitcoind',
      lndNetwork: 'mainnet',
      autopilot: false, // eslint-disable-line object-shorthand
      externalIP: '',
      lndTor: true, // Added February 2019
    },
    system: {
      systemDisplayUnits: 'btc',
      sshEnabled: false
    },
  };

  const exists = await diskLogic.settingsFileExists();
  if (!exists) {
    const validation = schemaValidator.validateSettingsSchema(defaultConfig);
    if (!validation.valid) {
      return new LNNodeError(validation.errors);
    }

    await rpcCredIntegrityCheck(defaultConfig);
    await diskLogic.writeSettingsFile(defaultConfig);

    return defaultConfig;
  } else { // handle existing settings files
    const settings = await diskLogic.readSettingsFile();

    // create bitcoind rpc creds as necessary
    await rpcCredIntegrityCheck(settings);

    // On boot of the device SSH is guaranteed not be running, where as boot of the manager container SSH maybe running.
    const sshEnabledStatus = await diskLogic.readSshSignalFile();
    if (sshEnabledStatus !== 'started') {
      settings['system']['sshEnabled'] = false;
    }

    await diskLogic.writeSettingsFile(settings);

    return settings;
  }
}

// Checks that a single application has a default version file. It will create a version file if it doesn't exist.
// Returns the application version.
async function appVersionIntegrityCheck(appVersionFile) {
  if (!await diskLogic.fileExists(constants.WORKING_DIRECTORY + '/' + appVersionFile)) {
    await diskLogic.writeAppVersionFile(appVersionFile, {
      version: '2.0.0',
    });
  }

  return await diskLogic.readAppVersionFile(appVersionFile);
}

// Checks where all applications have a default version file. It will create a version file if it doesn't exist. Returns
// all the application versions.
async function appVersionsIntegrityCheck() {

  const appVersions = {};

  appVersions[constants.APPLICATIONS.ERROR] = await appVersionIntegrityCheck(constants.APP_VERSION_FILES.ERROR);
  appVersions[constants.APPLICATIONS.LOGSPOUT] = await appVersionIntegrityCheck(constants.APP_VERSION_FILES.LOGSPOUT);
  appVersions[constants.APPLICATIONS.MANAGER] = await appVersionIntegrityCheck(constants.APP_VERSION_FILES.MANAGER);
  appVersions[constants.APPLICATIONS.TOR] = await appVersionIntegrityCheck(constants.APP_VERSION_FILES.TOR);
  appVersions[constants.APPLICATIONS.LIGHTNING_NODE]
    = await appVersionIntegrityCheck(constants.APP_VERSION_FILES.LIGHTNING_NODE);
  appVersions[constants.APPLICATIONS.DEVICE_HOST]
    = await appVersionIntegrityCheck(constants.APP_VERSION_FILES.DEVICE_HOST);

  return appVersions;
}

// Check whether the settings.json file contains rpcUser and rpcPassword. Historically it has not contained this by
// default.
async function rpcCredIntegrityCheck(settings) {
  if (!Object.prototype.hasOwnProperty.call(settings.bitcoind, 'rpcUser')) {
    settings.bitcoind.rpcUser = UUID.create();
  }

  if (!Object.prototype.hasOwnProperty.call(settings.bitcoind, 'rpcPassword')) {
    settings.bitcoind.rpcPassword = UUID.create();
  }
}

/* eslint-enable no-magic-numbers */

// Return the serial id of the device.
async function getSerial() {
  return constants.SERIAL;
}

// Return info device reset state, in-progress and/or it has encountered errors.
async function getSystemStatus() {
  return systemStatus;
}

// Save system settings
async function saveSettings(settings) {
  const appVersions = await appVersionsIntegrityCheck();
  const currentConfig = await diskLogic.readSettingsFile();
  const newConfig = JSON.parse(JSON.stringify(currentConfig));

  var lndSettings = settings['lnd'];
  var bitcoindSettings = settings['bitcoind'];
  var systemSettings = settings['system'];

  // If Tor is active for Lnd, we erase the manually entered externalIP. This results in Lnd only being available over
  // Tor. This increases privacy by only advertising the onion address.
  // TODO should we remove externalIP for V2?
  if (lndSettings.tor) {
    lndSettings.externalIP = '';
  }

  for (const key in lndSettings) {
    if (lndSettings[key] !== undefined) {
      newConfig['lnd'][key] = lndSettings[key];
    }
  }

  for (const key in bitcoindSettings) {
    if (bitcoindSettings[key] !== undefined) {
      newConfig['bitcoind'][key] = bitcoindSettings[key];
    }
  }

  for (const key in systemSettings) {
    if (systemSettings[key] !== undefined) {
      newConfig['system'][key] = systemSettings[key];
    }
  }

  const validation = schemaValidator.validateSettingsSchema(newConfig);
  if (!validation.valid) {
    throw new LNNodeError(validation.errors);
  }

  const recreateBitcoind = JSON.stringify(currentConfig.bitcoind) !== JSON.stringify(newConfig.bitcoind);
  const recreateLnd = JSON.stringify(currentConfig.lnd) !== JSON.stringify(newConfig.lnd);
  const toggleSsh = JSON.stringify(currentConfig.system.sshEnabled) !== JSON.stringify(newConfig.system.sshEnabled);

  await diskLogic.writeSettingsFile(newConfig);

  // Launch lightning-node application if any recreation is needed.
  if (recreateBitcoind || recreateLnd) {
    const appsToLaunch = {};
    appsToLaunch[constants.APPLICATIONS.LIGHTNING_NODE] = appVersions[constants.APPLICATIONS.LIGHTNING_NODE];
    await launchApplications(appsToLaunch);
  }

  // Automatically unlock lnd if we just recreated it.
  if (recreateLnd) {
    const jwt = await getJwt();
    await unlockLnd(jwt);
  }

  // Toggle SSH if needed.
  if (toggleSsh) {
    const state = newConfig.system.sshEnabled;
    await diskLogic.enableSsh(state);
  }
}

// Update local build artifacts one per hour.
async function updatingArtifactsService() {
  if (updatingArtifactsInterval !== {}) {
    updatingArtifactsInterval = setInterval(updateBuildArtifacts, constants.TIME.ONE_HOUR_IN_MILLIS);
  }
}

// Get the version of a service for a given yml file.
async function getVersionFromYml(ymlPath, service) {
  const fileContents = await diskLogic.readUtf8File(ymlPath);

  const lines = fileContents.split('\n');

  for (const line of lines) {
    if (line.includes('image: casanode${REPOSITORY_ADDENDUM}/' + service)) {
      const parts = line.split('-');

      // Grab the last part because the service itself could have zero or more dashes.
      // ex
      // image: casanode${REPOSITORY_ADDENDUM}/lnd:${TAG}-2.0.0
      // image: casanode${REPOSITORY_ADDENDUM}/space-fleet:${TAG}-2.0.0
      return parts[parts.length - 1];
    }
  }

  throw new Error('Could node find version for service ' + service + 'in yml.');
}

async function getNewestServices() {

  const services = [];

  const updatesAvailable = (await getVersions()).applications;
  const applicationNames = Object.keys(updatesAvailable);

  // Iterate through all apps.
  for (const applicationName of applicationNames) {

    // If there are any new versions available.
    if (updatesAvailable[applicationName].newVersionsAvailable.length === 0) {
      continue;
    }

    const applicationVersion = updatesAvailable[applicationName].newVersionsAvailable[
      updatesAvailable[applicationName].newVersionsAvailable.length - 1];

    // Get build details for each available new version one at a time.
    const app = {};
    app[applicationName] = {
      version: applicationVersion,
    };
    const buildDetails = await diskLogic.getBuildDetails(app);

    // There should only be one item in this array.
    if (buildDetails.length !== 1) {
      throw new Error('Build details are not the expected length' + buildDetails.length);
    }

    // Iterate through each service of the app. This will try to pull every service in the application regardless
    // of if it is needed. We could speed this up by checking if the image about to be pulled already exists
    // locally.
    for (const service of constants.APPLICATION_TO_SERVICES_MAP[applicationName]) {

      // Only verify images on production or pre-production.
      if (process.env.TAG === 'arm' || process.env.TAG === 'x86') {

        // Get Docker Hub auth token.
        const version = await getVersionFromYml(buildDetails[0].ymlPath, service);
        const dockerHubBearer = await dockerHubService.getAuthenticationToken(service);

        const dockerHubServiceManifest = await dockerHubService.getDigest(dockerHubBearer.data.token, service,
          process.env.TAG + '-' + version);
        const digests = await diskLogic.readJsonFile(buildDetails[0].digestsPath);

        // Compare the digest in docker hub with the expected digest.
        if (dockerHubServiceManifest.data.config.digest === digests[service][process.env.TAG]) {

          // Add each service.
          services.push({
            applicationName,
            applicationVersion,
            serviceName: service,
            serviceVersion: version,
            file: buildDetails[0].ymlPath,
          });
        } else {

          // Turn on this flag. It will remain on and block all updates and pull until Dockerhub manifest and the node
          // warehouse have digests that match.
          invalidDigestDetected = true;
          throw new Error('Unknown image detected, expected ' + service + ' digest to be '
            + digests[service][process.env.TAG] + ' but found ' + dockerHubServiceManifest.data.config.digest);
        }
      } else {

        const version = await getVersionFromYml(buildDetails[0].ymlPath, service);

        // Add each service.
        services.push({
          applicationName,
          applicationVersion,
          serviceName: service,
          serviceVersion: version,
          file: buildDetails[0].ymlPath,
        });
      }

    }
  }

  return services;
}

// Pulls all new images that are available from docker hub.
async function pullNewImages() {

  const services = await getNewestServices();

  // For each service path pair.
  for (const service of services) {

    // Pull each service's image.
    await dockerComposeLogic.dockerComposePull({
      service: service.serviceName,
      file: service.file,
    });
  }

  // Set this to true if no invalid digests were found.
  invalidDigestDetected = false;
}

// Returns all applications on this device. Each application lists the current version and new versions that are
// available. We also return a boolean property updatingBuildArtifacts that represents if we are currently updating the
// build artifacts. If we are, we will block upgrading until updating is complete.
async function getVersions() {
  const appVersions = await appVersionsIntegrityCheck();

  const applicationsNames = Object.keys(appVersions);

  const response = {
    applications: {},
    updatingBuildArtifacts,
    invalidDigestDetected,
  };

  // Iterate through all applications.
  for (const applicationName of applicationsNames) {

    // Add the current version to the response.
    response.applications[applicationName] = {
      version: appVersions[applicationName].version,
    };

    const newVersionsAvailable = [];
    const allVersionsList = await diskLogic.listVersionsForApp(applicationName);

    // Iterate from all versions that exists for a given application.
    for (const version of allVersionsList) {

      // Add the new version if it is greater than the current version
      if (semver.gt(version, appVersions[applicationName].version)) {
        newVersionsAvailable.push(version);
      }
    }

    response.applications[applicationName].newVersionsAvailable = newVersionsAvailable;
  }

  return response;
}

// Set the CASA_NODE_HIDDEN_SERVICE env variable.
//
// The Casa Node Hidden Service is created after tor boot. It happens quickly, but it isn't instant. We retry several
// times to retrieve it. If it cannot be retrieved Casa Node services will not be available via tor.
// TODO find a better strategy for creating hidden services.
async function setHiddenServiceEnv() {

  let attempt = 0;

  do {

    attempt++;

    if (await diskLogic.hiddenServiceFileExists()) {
      process.env.CASA_NODE_HIDDEN_SERVICE = ('http://'
        + await diskLogic.readHiddenService()).replace('\n', '');
    } else {
      await sleepSeconds(RETRY_SECONDS);
    }
  } while (!process.env.CASA_NODE_HIDDEN_SERVICE && attempt <= RETRY_ATTEMPTS);
}

// Launch set of applications.
async function launchApplications(appsToLaunch) {

  const applicationsNames = Object.keys(appsToLaunch);

  // Docker compose up each service one at a time.
  for (const applicationName of applicationsNames) {
    await dockerComposeLogic.dockerComposeUp({
      application: applicationName,
    });
  }
}

// Run startup functions
/* eslint-disable no-magic-numbers */
async function startup() {

  let errorThrown = false;

  // keep retrying the startup process if there are any errors
  do {
    bootPercent = 10;
    await settingsFileIntegrityCheck();
    const appVersions = await appVersionsIntegrityCheck();
    await checkYMLs(appVersions);

    bootPercent = 20;

    try {
      await checkAndUpdateLaunchScript();

      const ipv4 = ipAddressUtil.getLanIPAddress();
      if (ipv4) {
        process.env.DEVICE_HOST = ipv4;
      } else {
        // Add a log, but do not block the startup process.
        logger.info('No ipv4 address available. Plug in ethernet.', 'startup');
      }

      bootPercent = 30;

      // Stop all containers. This will guarentee that they always boot in the same order. If they don't boot in the
      // correct order, Tor will not work.
      await dockerLogic.stopNonPersistentContainers();
      bootPercent = 40;

      const appsToLaunch = {};
      appsToLaunch[constants.APPLICATIONS.LOGSPOUT] = appVersions[constants.APPLICATIONS.LOGSPOUT];
      appsToLaunch[constants.APPLICATIONS.TOR] = appVersions[constants.APPLICATIONS.TOR];

      // If a hidden service doesn't exist for the user interface we need to create it.
      if (!process.env.CASA_NODE_HIDDEN_SERVICE) {

        // Start space-fleet and lnapi before tor. Tor will then be able to create a hidden service for them.
        await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.SPACE_FLEET});
        await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.LNAPI});
        await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.TOR});
      }

      // Wait for tor to create a hidden service.
      await setHiddenServiceEnv();

      // Launching/Relaunching all remaining apps. This will include recreating space-fleet and lnapi with the new
      // hidden service. It will also recreate tor because space-fleet and lnapi have to be online before tor is
      // started.
      await launchApplications(appsToLaunch);

      // Then we start bitcoind and lnd, because they need tor online.
      await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.BITCOIND});
      await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.LND});

      bootPercent = 80;

      // Let the interval services run async.
      startIntervalServices();

      errorThrown = false;
    } catch (error) {
      errorThrown = true;
      logger.error(error.message, error.stack);

      await sleepSeconds(RETRY_SECONDS);
    }
  } while (errorThrown);

  bootPercent = 100;
}

/* eslint-enable no-magic-numbers */

// Starts the interval service Lan IP Management.
async function startLanIPIntervalService() {
  if (lanIPManagementInterval !== {}) {
    lanIPManagementInterval = setInterval(lanIPManagement, constants.TIME.FIVE_MINUTES_IN_MILLIS);
  }
}

// If the lan ip address has changed, we need to recreate most services. In the future it
// would be ideal if we could update the dependencies without having to recreate them.
async function lanIPManagement() {

  // If this service is already running, do not run a second instance.
  if (ipManagementRunning) {
    return;
  }

  ipManagementRunning = true;

  try {
    const newDeviceHost = ipAddressUtil.getLanIPAddress();

    if (process.env.DEVICE_HOST !== newDeviceHost) {
      await startup();
    }
  } catch (error) {
    throw error;
  } finally {
    ipManagementRunning = false;
  }
}

// Removes the bitcoind chain.
async function resyncChain() {

  try {
    resetSystemStatus();

    systemStatus.resync = true;
    systemStatus.error = false;

    systemStatus.details = 'stopping lnd...';
    await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.LND});
    systemStatus.details = 'stopping bitcoind...';
    await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.BITCOIND});

    systemStatus.details = 'wiping existing bitcoin chain...';
    await dockerComposeLogic.dockerComposeRemove({service: constants.SERVICES.BITCOIND});
    await dockerLogic.removeVolume('applications_bitcoind-data');

    systemStatus.details = 'starting bitcoind...';
    await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.BITCOIND});
    systemStatus.details = 'starting lnd...';
    await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.LND});

    resetSystemStatus();
  } catch (error) {
    systemStatus.error = true;
    systemStatus.details = 'see logs for more details...';
  }
}

// Start all interval services.
async function startIntervalServices() {
  await startLanIPIntervalService();
  await startLndIntervalService();
  await updatingArtifactsService();
}

// Stop scheduling new interval services. Currently running interval services will still complete.
function stopIntervalServices() {
  if (updatingArtifactsInterval !== {}) {
    clearInterval(updatingArtifactsInterval);
    updatingArtifactsInterval = {};
  }

  if (lndManagementInterval !== {}) {
    clearInterval(lndManagementInterval);
    lndManagementInterval = {};
  }

  if (lanIPManagementInterval !== {}) {
    clearInterval(lanIPManagementInterval);
    lanIPManagementInterval = {};
  }
}

// Stops all services and removes artifacts that aren't labeled with 'casa=persist'. Remove all data in volumes that
// relate to lnd, tor, settings, or logs.
async function reset() {
  try {
    bootPercent = 1;

    stopIntervalServices();

    await dockerLogic.stopNonPersistentContainers();
    await dockerLogic.pruneContainers();

    // Turn SSH on and resets SSH password
    const currentConfig = await diskLogic.readSettingsFile();
    currentConfig.system.sshEnabled = false;
    await saveSettings(currentConfig);
    await authLogic.hashAccountPassword(constants.DEFAULT_SSH_PASSWORD);

    // Delete volumes
    await wipeSettingsVolume();
    await wipeAccountsVolume();
    await dockerLogic.removeVolume('applications_channel-data');
    await dockerLogic.removeVolume('applications_lnd-data');
    await dockerLogic.removeVolume('applications_logs');

    // Delete tor data from the existing volumes. The volumes can't be deleted because the manager is dependant on it.
    await diskLogic.deleteItemsInDir('/root/.tor');
    await diskLogic.deleteItemsInDir('/var/lib/tor/');

    // Erase any details of a previous migration.
    await diskLogic.writeMigrationStatusFile({details: '', error: false});

    // Reset the user interface hidden service in memory.
    process.env.CASA_NODE_HIDDEN_SERVICE = undefined;

  } catch (error) {
    logger.error(error.message, 'factory-reset', error);
  } finally {

    // Start up all applications.
    await startup();
    bootPercent = 100; // eslint-disable-line no-magic-numbers
  }
}

async function userReset() {
  try {
    resetSystemStatus();
    systemStatus.resetting = true;
    systemStatus.error = false;
    stopIntervalServices();
    await dockerLogic.stopNonPersistentContainers();
    await dockerLogic.pruneContainers();
    await dockerLogic.pruneNetworks();

    await wipeSettingsVolume();
    await wipeAccountsVolume();
    await dockerLogic.removeVolume('applications_channel-data');
    await dockerLogic.removeVolume('applications_lnd-data');

    await settingsFileIntegrityCheck();

    // Spin up applications
    await dockerComposeLogic.dockerComposeUpSingleService({service: 'space-fleet'});
    await dockerComposeLogic.dockerComposeUp({service: constants.SERVICES.BITCOIND}); // Launching all services
    await dockerComposeLogic.dockerComposeUp({service: constants.SERVICES.LOGSPOUT}); // Launching all services
    await startIntervalServices();
    systemStatus.error = false;
  } catch (error) {
    systemStatus.error = true;
    await dockerComposeLogic.dockerComposeUpSingleService({service: 'space-fleet'});
  } finally {
    systemStatus.resetting = false;
  }
}

// Puts the device in a state where it is safe to unplug the power. Currently, we shutdown lnd and bitcoind
// appropriately. In the future we will shutdown the entire device.
async function shutdown() {

  // If docker is pulling and is only partially completed, when the device comes back online, it will install the
  // partial update. This could cause breaking changes. To avoid this, we will stop the user from shutting down the
  // device while docker is pulling.
  if (updatingBuildArtifacts) {
    throw new DockerPullingError();
  }

  await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.LND});
  await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.BITCOIND});
  await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.SPACE_FLEET});

  await diskLogic.shutdown();
}

// Do we have an image for the given service on device.
function hasImage(images, service, version) {

  // Iterate through all images.
  for (const image of images) {

    // RepoTags is a nullable array. We have to null check and then loop over each tag.
    if (image.RepoTags) {

      // Iterate through all repo tags
      for (const tag of image.RepoTags) {

        // example tag 'casanode/manager:arm-2.0.0'
        let fullTag = 'casanode';

        if (process.env.REPOSITORY_ADDENDUM) {
          fullTag += process.env.REPOSITORY_ADDENDUM;
        }

        fullTag += '/' + service + ':' + process.env.TAG + '-' + version;

        if (tag === fullTag) {

          // Return immediately if tag is found.
          return true;
        }
      }
    }
  }

  return false;
}

// Performs a migration for V1 node to this device.
async function migration() {
  await diskLogic.migration();

  // Start restart lnd background process.
  if (restartLndInterval !== {}) {
    restartLndInterval = setInterval(restartLnd, constants.TIME.ONE_SECOND_IN_MILLIS);
  }
}

// Check the migration status and restart lnd as necessary.
async function restartLnd() {

  // Return if this this background process is already running.
  if (restartLndRunning) {
    return;
  }

  restartLndRunning = true;

  try {
    const migrationStatus = await diskLogic.readMigrationStatusFile();

    if (migrationStatus.error === false && migrationStatus.details === 'completed') {
      await dockerComposeLogic.dockerComposeRestart({service: constants.SERVICES.LND});
      clearInterval(restartLndInterval);
    } else if (migrationStatus.error) {
      clearInterval(restartLndInterval);
    }
  } catch (error) {
    logger.error(error.message, 'restartLnd', error.stack);
  } finally {
    restartLndRunning = false;
  }
}

// Return the status of migration
async function getMigrationStatus() {
  const migrationStatus = await diskLogic.readMigrationStatusFile();

  return migrationStatus;
}

// Update all applications to the latest version. Then rerun the launch script.
async function update() {

  let managerUpdate = false;
  const images = await dockerLogic.getImages();

  // Block the user from updating if the invalid digest flag is set to true.
  if (invalidDigestDetected) {
    throw new Error('Cannot update, an invalid digest has been detected');
  }

  // Block updates if the node is currently pulling new images.
  if (updatingBuildArtifacts) {
    throw new Error('Currently downloading build artifacts');
  }

  // TODO handle case when auto download fails because of internet failure or power failure.

  const services = await getNewestServices();

  // For each service.
  for (const service of services) {

    // If the image does not exist on device, throw an error. This likely means that this service's digest was
    // rejected and then the device was physically restarted. Upon restart the user then tried to update.
    if (!hasImage(images, service.serviceName, service.serviceVersion)) {
      throw new Error('Cannot update, ' + service.serviceName + ' version ' + service.serviceVersion
        + ' does not exist on device.');
    }

    if (service.serviceName === constants.SERVICES.MANAGER) {
      managerUpdate = true;
    }

    // TODO don't hard code json
    const appVersion = await diskLogic.readAppVersionFile(service.applicationName + '.json');
    appVersion.version = service.applicationVersion;
    await diskLogic.writeAppVersionFile(service.applicationName + '.json', appVersion);
  }

  // Update ymls appropriately.
  const appVersions = await appVersionsIntegrityCheck();
  await checkYMLs(appVersions);

  // Relaunch the manager if it was updated. Otherwise just run the startup function.
  if (managerUpdate) {
    await diskLogic.relaunch();
  } else {

    // Let the startup function run async.
    startup();
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

// Compare known compose files which are pulled on a regular basic from from a public github repo. Compare these with
// with yml files on the local file system. Replace any that are missing or have changed.
async function checkYMLs(appVersions) {

  // Return and skip yml updates
  if (process.env.DISABLE_YML_UPDATE === 'true') {
    return;
  }

  const knownYMLs = Object.assign({}, constants.COMPOSE_FILES);
  const updatableYMLs = Object.values(knownYMLs);
  const outdatedYMLs = [];

  for (const knownYMLFile of updatableYMLs) {
    try {
      // Get the name of the application. Currently convention of yml files are <application name>.yml.
      const application = knownYMLFile.split('.')[0];
      const version = appVersions[application].version;

      const canonicalMd5 = md5Check.sync(constants.WORKING_DIRECTORY + '/' + application + '/' + version + '/'
        + knownYMLFile);
      const ondeviceMd5 = md5Check.sync(constants.WORKING_DIRECTORY + '/' + knownYMLFile);

      // Don't update the manager.yml file on MAC. It requires a special yml.
      if (canonicalMd5 !== ondeviceMd5) {
        if (process.env.MAC && knownYMLFile === constants.COMPOSE_FILES.MANAGER) {
          // no op
        } else {
          outdatedYMLs.push(knownYMLFile);
        }
      }
    } catch (error) {
      outdatedYMLs.push(knownYMLFile);
    }
  }

  if (outdatedYMLs.length !== 0) {
    await updateYMLs(appVersions, outdatedYMLs);
  }
}

// Stop non-persistent containers, and copy over outdated YMLs, restart services.
// Declared services could be different between the YMLs, so stop everything.
// Might need to disable for AWS instances with <4 CPUs as we dynamically configure CPU resources.
async function updateYMLs(appVersions, outdatedYMLs) {
  try {
    systemStatus.updating = true;
    await dockerLogic.stopNonPersistentContainers();
    await dockerLogic.pruneContainers();

    for (const outdatedYML of outdatedYMLs) {

      // Get the name of the application. Currently convention of yml files are <application name>.yml.
      const application = outdatedYML.split('.')[0];
      const version = appVersions[application].version;
      const ymlFile = constants.WORKING_DIRECTORY + '/' + application + '/' + version + '/' + outdatedYML;

      await bashService.exec('cp', [ymlFile, constants.WORKING_DIRECTORY], {});
    }

    stopIntervalServices();
    systemStatus.error = false;
  } catch (error) {
    systemStatus.error = true;
  } finally {
    systemStatus.updating = false;
  }
}

// Compare the launch script that was placed in the manager container at build time with the launch scripts that exists
// on the file system. Update it if there are any differences.
async function checkAndUpdateLaunchScript() { // eslint-disable-line id-length
  try {
    systemStatus.updating = true;
    const canonicalMd5 = md5Check.sync(constants.CANONICAL_YML_DIRECTORY.concat('/' + constants.LAUNCH_SCRIPT));
    const ondeviceMd5 = md5Check.sync(constants.LAUNCH_DIRECTORY.concat('/' + constants.LAUNCH_SCRIPT));

    // TODO: tell space-fleet to tell the user to restart their device.
    if (canonicalMd5 !== ondeviceMd5) {
      const launchScriptFile = constants.CANONICAL_YML_DIRECTORY + '/' + constants.LAUNCH_SCRIPT;
      await bashService.exec('cp', [launchScriptFile, constants.LAUNCH_DIRECTORY], {});
    }
    systemStatus.error = false;
  } catch (error) {
    systemStatus.error = true;
  } finally {
    systemStatus.updating = false;
  }
}

// Sleep for a given number of seconds
function sleepSeconds(seconds) {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * constants.TIME.ONE_SECOND_IN_MILLIS);
  });
}

// Start the Lnd Management interval service.
async function startLndIntervalService() {

  // Only start lnd management if another instance is not already running.
  if (lndManagementInterval !== {} || lndManagementRunning) {

    // Run lnd management immediately and then rerun every hour. This makes it more likely that the user skips the
    // initial login modal for lnd.
    await lndManagement();
    lndManagementInterval = setInterval(lndManagement, constants.TIME.ONE_HOUR_IN_MILLIS);
  }
}

// Get a new valid jwt token.
async function getJwt() {
  const genericUser = {
    username: 'admin',
    password: authLogic.getCachedPassword(),
  };

  return (await authLogic.login(genericUser)).jwt;
}

// Keeps lnd unlocked and up to date with the most accurate external ip.
async function lndManagement() {

  // If this service is already running, do not run a second instance.
  if (lndManagementRunning) {
    return;
  }

  if (!authLogic.getCachedPassword()) {
    return;
  }

  lndManagementRunning = true;
  try {

    // Check to see if lnd is currently running.
    if (await dockerLogic.isRunningService(constants.SERVICES.LND)) {

      // Make sure we have a valid auth token.
      const jwt = await getJwt();

      const currentConfig = await diskLogic.readSettingsFile();
      const addresses = (await lnapiService.getBitcoindAddresses(jwt)).data;

      let externalIP;
      for (const address of addresses) {
        if (!address.includes('onion')) {
          externalIP = address;
        }
      }

      // If an external ip has been set and is not equal to the current external ip and tor is not active. Tor handles
      // external address on its own.
      if (currentConfig.externalIP !== ''
        && currentConfig.externalIP !== externalIP
        && !currentConfig.lnd.tor) {

        currentConfig.externalIP = externalIP;
        await saveSettings(currentConfig);
      }
    }

  } catch (error) {
    throw error;
  } finally {
    lndManagementRunning = false;
  }
}

async function unlockLnd(jwt) {
  // Unlock lnd via api call. Try up to 5 times. Lnd can fail to unlock if it was just started. It takes a few
  // seconds to boot up on a Raspberry pi 3B+.
  let attempt = 0;
  let errorOccurred;

  do {
    errorOccurred = false;
    try {
      attempt++;
      await lnapiService.unlockLnd(authLogic.getCachedPassword(), jwt);
    } catch (error) {

      // TODO: Handle this type of expected error the same way that we handle change password.
      errorOccurred = true;
      logger.info(error.message, 'lnd-management', error.stack);

      await sleepSeconds(RETRY_SECONDS);
    }

  } while (errorOccurred && attempt < RETRY_ATTEMPTS);
}

// Get new build artifacts from remote services. Build artifacts include yml files, images, dependencies and more.
async function updateBuildArtifacts() {
  try {
    // Return immediately if we are already pulling.
    if (updatingBuildArtifacts) {
      return;
    }

    updatingBuildArtifacts = true;
    await diskLogic.deleteFoldersInDir(constants.TMP_DIRECTORY);
    await diskLogic.deleteFoldersInDir(constants.WORKING_DIRECTORY);
    await git.clone({});
    await diskLogic.moveFoldersToDir(constants.TMP_BUILD_ARTIFACTS_DIRECTORY, constants.WORKING_DIRECTORY);
    await pullNewImages();
  } catch (error) {
    throw error;
  } finally {
    updatingBuildArtifacts = false;
  }
}

async function login(user) {
  try {
    const jwt = await authLogic.login(user);

    // Don't wait for lnd management to complete. It takes 10 seconds on a Raspberry Pi 3B+. Running in the background
    // improves UX.
    unlockLnd(jwt.jwt);

    return jwt;
  } catch (error) {
    throw error;
  }
}

async function refresh(user) {
  return await authLogic.refresh(user);
}

module.exports = {
  getAddresses,
  getBootPercent,
  getSerial,
  getSystemStatus,
  getVersions,
  login,
  saveSettings,
  shutdown,
  startLndIntervalService,
  startup,
  stopIntervalServices,
  reset,
  resyncChain,
  refresh,
  userReset,
  update,
  updateBuildArtifacts,
  migration,
  getMigrationStatus
};
