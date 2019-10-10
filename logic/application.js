/* eslint-disable max-lines */

const authLogic = require('logic/auth.js');
const dockerComposeLogic = require('logic/docker-compose.js');
const dockerLogic = require('logic/docker.js');
const diskLogic = require('logic/disk.js');
const git = require('logic/git.js');
const constants = require('utils/const.js');
const bashService = require('services/bash.js');
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

const RETRY_SECONDS = 10;
const RETRY_ATTEMPTS = 10;

let updatingArtifactsInterval = {};
let updatingBuildArtifacts = false; // is the manager currently updating build artifacts

let systemStatus;
let bootPercent = 0; // An approximate state of where the manager is during boot.
resetSystemStatus();

// Get all ip or onion address that can be used to connect to this Casa node.
async function getAddresses() {

  // Get ip address.
  const addresses = [ipAddressUtil.getLanIPAddress()];

  const currentConfig = await diskLogic.readSettingsFile();

  // Check to see if tor is turned on and add onion address if Tor has created a new hidden service.
  if (process.env.CASA_NODE_HIDDEN_SERVICE
    && (currentConfig.lnd.lndTor || currentConfig.bitcoind.bitcoindTor)) {

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

async function downloadChain() {
  await dockerComposeLogic.dockerLoginCasaworker();

  await dockerComposeLogic.dockerComposePull({service: constants.SERVICES.DOWNLOAD});
  systemStatus.details = 'downloading blocks...';
  await dockerComposeLogic.dockerComposeUpSingleService({
    service: constants.SERVICES.DOWNLOAD,
    attached: true,
  });
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

  appVersions[constants.APPLICATIONS.DOWNLOAD] = await appVersionIntegrityCheck(constants.APP_VERSION_FILES.DOWNLOAD);
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

// Return true if there was an issue downloading a file otherwise false.
async function getResyncFailed() {
  const options = {};

  const logs = await bashService.exec('docker', ['logs', 'download'], options);

  if (logs.out.includes('failed') || logs.out.includes('Failed')) {
    return true;
  } else {
    return false;
  }
}

/* eslint-disable no-magic-numbers */
async function setResyncDetails() {
  try {
    const options = {};

    // Use the last 20 logs to save time by avoiding the entire logs
    const logs = await bashService.exec('docker', ['logs', 'download', '--tail', '5'], options);

    const list = logs.out.split('\r');

    for (let index = list.length - 1; index > -1; index--) {
      // Make sure text contains both Completed and file(s). This is because docker logs for the download container does
      // not produce clean logs. Sometimes lines overwrite each other at the ends. By ensuring both words exist, we
      // ensure a clean log.
      if (list[index].includes('Completed') && list[index].includes('file(s)')) {

        // return and remove extra text
        const details = list[index].split(' remaining')[0];

        // sample details 'Completed 95.2 MiB/~7.7 GiB (12.2 MiB/s) with ~62 file(s)'
        // sample details 'Completed 95.2 MiB/7.7 GiB (12.2 MiB/s) with ~62 file(s)'
        const parts = details.split(' ');
        const downloadedAmount = parts[1];
        const downloadedAmountUnit = parts[2].split('/')[0];
        let totalAmount = parts[2].split('/')[1].replace('~', '');
        let totalAmountUnit = parts[3];
        const speed = (parts[4] + ' ' + parts[5]).replace('(', '').replace(')', '');

        // The download container only gives a 10 GiB lead on downloading. Because of this, we will estimate the total
        // amount until it gets closer to the end.
        if (systemStatus.full && (downloadedAmount < 210 && downloadedAmountUnit === 'GiB'
          || downloadedAmountUnit === 'MiB')) {

          totalAmount = '220';
          totalAmountUnit = 'GiB';
        }

        systemStatus.downloadedAmount = downloadedAmount;
        systemStatus.downloadedAmountUnit = downloadedAmountUnit;
        systemStatus.totalAmount = totalAmount;
        systemStatus.totalAmountUnit = totalAmountUnit;
        systemStatus.speed = speed;

        // short circuit loop
        index = -1;
      }
    }
  } catch (error) {
    // If the download container does not exist, it will throw an error. In that case, we will just return the
    // details as is.
  }
}

/* eslint-enable no-magic-numbers */

// Return the serial id of the device.
async function getSerial() {
  return constants.SERIAL;
}

// Return info device reset state, in-progress and/or it has encountered errors.
async function getSystemStatus() {

  if (systemStatus.resync) {
    await setResyncDetails();
  }

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
}

// Update local build artifacts one per hour.
async function updatingArtifactsService() {
  if (updatingArtifactsInterval !== {}) {
    updatingArtifactsInterval = setInterval(updateBuildArtifacts, constants.TIME.ONE_HOUR_IN_MILLIS);
  }
}

// Pulls all new images that are available from docker hub.
async function pullNewImages() {

  const updatesAvailable = (await getVersions()).applications;
  const applicationNames = Object.keys(updatesAvailable);

  // Iterate through all apps.
  for (const applicationName of applicationNames) {

    // Iterate through each new available version of each app.
    for (const version of updatesAvailable[applicationName].newVersionsAvailable) {

      // Get build details for each available new version one at a time.
      const app = {};
      app[applicationName] = {
        version,
      };
      const buildDetails = await diskLogic.getBuildDetails(app);

      // There should only be one item in this array.
      for (const build of buildDetails) {

        // Iterate through each service of the app. This will try to pull every service in the application regardless
        // of if it is needed. We could speed this up by checking if the image about to be pulled already exists
        // locally.
        for (const service of constants.APPLICATION_TO_SERVICES_MAP[applicationName]) {

          // Pull each service's image.
          await dockerComposeLogic.dockerComposePull({
            service,
            file: build.ymlPath,
          });
        }
      }
    }
  }
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

      const appsToLaunch = {};
      appsToLaunch[constants.APPLICATIONS.LIGHTNING_NODE] = appVersions[constants.APPLICATIONS.LIGHTNING_NODE];
      appsToLaunch[constants.APPLICATIONS.LOGSPOUT] = appVersions[constants.APPLICATIONS.LOGSPOUT];

      // Start space-fleet and lnapi before tor. Tor will then be able to create a hidden service.
      await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.SPACE_FLEET});
      await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.LNAPI});
      await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.TOR});

      // Wait for tor to create a hidden service.
      await setHiddenServiceEnv();

      // Launching/Relaunching all remaining apps. This will include recreating space-fleet with the new hidden service.
      await launchApplications(appsToLaunch);

      bootPercent = 80;
      await startIntervalServices();

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

// Removes the bitcoind chain if full is true and optionally resync it from Casa's aws server.
async function resyncChain(full, syncFromAWS) {

  try {
    resetSystemStatus();

    systemStatus.full = !!full;
    systemStatus.resync = true;
    systemStatus.error = false;

    systemStatus.details = 'stopping lnd...';
    await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.LND});
    systemStatus.details = 'stopping bitcoind...';
    await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.BITCOIND});

    if (full) {
      systemStatus.details = 'wiping existing bitcoin chain...';
      await dockerComposeLogic.dockerComposeRemove({service: constants.SERVICES.BITCOIND});
      await dockerLogic.removeVolume('applications_bitcoind-data');
    } else {
      systemStatus.details = 'cleaning existing bitcoin chain...';

      // TODO do we really need to wipe index and chainstate?
    }

    if (syncFromAWS) {
      let attempt = 0;
      let failed = false;
      do {
        attempt++;

        systemStatus.details = 'trying attempt ' + attempt + '...';
        await downloadChain();
        failed = await getResyncFailed();

        // removing download container to erase logs from previous attempts
        await dockerComposeLogic.dockerComposeRemove({service: constants.SERVICES.DOWNLOAD});

      } while (failed && attempt <= RETRY_ATTEMPTS);
    }

    systemStatus.details = 'removing excess images...';
    await dockerLogic.pruneImages();

    systemStatus.details = 'starting bitcoind...';
    await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.BITCOIND});
    systemStatus.details = 'starting lnd...';
    await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.LND});

    resetSystemStatus();
  } catch (error) {
    systemStatus.error = true;
    systemStatus.details = 'see logs for more details...';

    // TODO what to do with lnd and bitcoind in the event of an error?
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

// Stops all services and removes artifacts that aren't labeled with 'casa=persist'.
// Remove docker images and pull then again if factory reset.
async function reset(factoryReset) {
  try {
    resetSystemStatus();
    systemStatus.resetting = true;
    systemStatus.error = false;
    stopIntervalServices();
    await dockerLogic.stopNonPersistentContainers();
    await dockerLogic.pruneContainers();
    await dockerLogic.pruneNetworks();
    await dockerLogic.pruneVolumes();
    await wipeSettingsVolume();
    await wipeAccountsVolume();

    if (factoryReset) {
      await dockerLogic.pruneImages(true);
      await updateBuildArtifacts();
    }
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

// Update all applications to the latest version. Then rerun the launch script.
async function update() {
  const updatesAvailable = (await getVersions()).applications;
  const applicationNames = Object.keys(updatesAvailable);

  // Iterate through all apps.
  for (const applicationName of applicationNames) {

    // Get the current version of the application.
    let latestVersion = updatesAvailable[applicationName].version;

    // Iterate through each new available version of each app.
    for (const version of updatesAvailable[applicationName].newVersionsAvailable) {

      // Assign the latest version.
      if (semver.gt(version, latestVersion)) {
        latestVersion = version;
      }
    }

    // TODO don't hard code json
    const appVersion = await diskLogic.readAppVersionFile(applicationName + '.json');
    appVersion.version = latestVersion;
    await diskLogic.writeAppVersionFile(applicationName + '.json', appVersion);
  }

  await diskLogic.relaunch();
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
};
