var q = require('q'); // eslint-disable-line id-length
const decamelizeKeys = require('decamelize-keys');

const bashService = require('services/bash.js');
const constants = require('utils/const.js');
const DockerComposeError = require('models/errors').DockerComposeError;
const diskLogic = require('logic/disk.js');

const WORKING_DIR = constants.WORKING_DIRECTORY;
const DOCKER_COMPOSE_COMMAND = 'docker-compose';
const DOCKER_COMMAND = 'docker';
const DOCKER_TIMEOUT_SECONDS = 600;

const injectSettings = async() => {

  const settings = await diskLogic.readSettingsFile(constants.SETTINGS_FILE);

  var lndSettings = decamelizeKeys(settings['lnd'], '_');
  var bitcoindSettings = decamelizeKeys(settings['bitcoind'], '_');

  var envData = {};
  for (const key in lndSettings) {
    if (Object.prototype.hasOwnProperty.call(lndSettings, key)) {
      envData[key.toUpperCase()] = lndSettings[key];
    }
  }

  for (const key in bitcoindSettings) {
    if (Object.prototype.hasOwnProperty.call(bitcoindSettings, key)) {
      envData[key.toUpperCase()] = bitcoindSettings[key];
    }
  }

  return envData;
};


function composeFile(options) {
  if (options !== undefined && options.fileName !== undefined) {
    return WORKING_DIR + '/' + options.fileName;
  }

  if (options.service === constants.SERVICES.DEVICE_HOST) {
    return WORKING_DIR + '/' + constants.COMPOSE_FILES.DEVICE_HOST;
  } else if (options.service === constants.SERVICES.DOWNLOAD) {
    return WORKING_DIR + '/' + constants.COMPOSE_FILES.DOWNLOAD;
  } else if (options.service === constants.SERVICES.LOGSPOUT
    || options.service === constants.SERVICES.PAPERTRAIL
    || options.service === constants.SERVICES.SYSLOG) {
    return WORKING_DIR + '/' + constants.COMPOSE_FILES.LOGSPOUT;
  } else if (options.service === constants.SERVICES.MANAGER) {
    return WORKING_DIR + '/' + constants.COMPOSE_FILES.MANAGER;
  } else if (options.service === constants.SERVICES.TOR) {
    return WORKING_DIR + '/' + constants.COMPOSE_FILES.TOR;
  } else {
    return WORKING_DIR + '/' + constants.COMPOSE_FILES.LIGHTNING_NODE;
  }
}

function addDefaultOptions(options) {
  options.cwd = WORKING_DIR;
  options.log = true;
  options.env = options.env || {};
  options.env.TAG = constants.TAG;
  options.env.DEVICE_HOST = process.env.DEVICE_HOST;

  // Add Casa Node Hidden Service if available.
  if (process.env.CASA_NODE_HIDDEN_SERVICE) {
    options.env.CASA_NODE_HIDDEN_SERVICE = process.env.CASA_NODE_HIDDEN_SERVICE;
  }
}

async function dockerComposeUp(options) {
  const file = composeFile(options);

  addDefaultOptions(options);
  options.env = await injectSettings();

  // Pass certain environmental variables as needed.
  if (file.endsWith(constants.COMPOSE_FILES.LOGSPOUT)) {
    options.env.SERIAL = constants.SERIAL;
  } else if (file.endsWith(constants.COMPOSE_FILES.LIGHTNING_NODE)) {
    // `lnapi` expects the JWT_PUBLIC_KEY value to be in hex.
    const jwtPubKey = await diskLogic.readJWTPublicKeyFile();
    options.env.JWT_PUBLIC_KEY = jwtPubKey.toString('hex');
  }

  const composeOptions = ['-f', file, 'up', '-d', '-t', DOCKER_TIMEOUT_SECONDS];

  try {
    await bashService.exec(DOCKER_COMPOSE_COMMAND, composeOptions, options);
  } catch (error) {
    throw new DockerComposeError('Unable to start services', error);
  }
}

// Pull an individual docker image.
async function dockerComposePull(options = {}) {
  const service = options.service;
  addDefaultOptions(options);

  // Remove starting ./ if exists. Docker compose does not like this.
  if (options.file.startsWith('./')) {
    options.file = options.file.substring(2, options.file.length); // eslint-disable-line no-magic-numbers
  }

  // Remove all dashes from service names. Dashes do not work with docker env variables. Example, space-fleet becomes
  // SPACEFLEETVERSION.
  options.env[options.service.name.replace('-', '').toUpperCase() + 'VERSION'] = options.version;

  await dockerLoginCasaworker();
  await bashService.exec(DOCKER_COMPOSE_COMMAND, ['-f', options.file, 'pull', service.name], options);
  await dockerLogout();
}

// Stop a docker container.
function dockerComposeStop(options = {}) {
  var deferred = q.defer();

  const file = composeFile(options);
  const service = options.service;
  addDefaultOptions(options);

  var composeOptions = ['-f', file, 'stop', '-t', DOCKER_TIMEOUT_SECONDS, service];

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  bashService.exec(DOCKER_COMPOSE_COMMAND, composeOptions, options)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

// Remove a stopped docker container.
function dockerComposeRemove(options = {}) {
  var deferred = q.defer();

  const file = composeFile(options);
  const service = options.service;
  addDefaultOptions(options);

  var composeOptions = ['-f', file, 'rm', '-f', service];

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  bashService.exec(DOCKER_COMPOSE_COMMAND, composeOptions, options)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

// Restart a docker container.
function dockerComposeRestart(options = {}) {
  var deferred = q.defer();

  const file = composeFile(options);
  const service = options.service;
  addDefaultOptions(options);

  var composeOptions = ['-f', file, 'restart', '-t', DOCKER_TIMEOUT_SECONDS, service];

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  bashService.exec(DOCKER_COMPOSE_COMMAND, composeOptions, options)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

// Use docker compose to create one service from a yml file. Retrieve the TAG from the .env file and the version from
// the application version files on device.
async function dockerComposeUpSingleService(options) { // eslint-disable-line id-length
  const file = composeFile(options);
  addDefaultOptions(options);
  options.env = await injectSettings();
  options.env.TAG = constants.TAG;

  // Remove all dashes from service names. Dashes do not work with docker env variables. Example, space-fleet becomes
  // SPACEFLEETVERSION.
  options.env[options.service.replace('-', '').toUpperCase() + 'VERSION'] = options.version;

  // Pass along environmental variables as needed.
  if (options.service === constants.SERVICES.PAPERTRAIL || options.service === constants.SERVICES.LOGSPOUT) {
    options.env.SERIAL = constants.SERIAL;
  } else if (options.service === constants.SERVICES.LNAPI) {
    // `lnapi` expects the JWT_PUBLIC_KEY value to be in hex.
    const jwtPubKey = await diskLogic.readJWTPublicKeyFile();
    options.env.JWT_PUBLIC_KEY = jwtPubKey.toString('hex');
  } else if (options.service === constants.SERVICES.DOWNLOAD) {
    options.env.ARCHIVE_CHAIN = 'bitcoind';
    options.env.ARCHIVE_NETWORK = options.env['BITCOIN_NETWORK'];
    options.env.AWS_DEFAULT_REGION = 'us-east-2';
  }

  const composeOptions = ['-f', file, 'up'];

  // By default everything will run in detached mode. However, in some cases we want to want for a container to complete
  // before returning. We pass the attached flag in that instance.
  if (!options.attached) {
    composeOptions.push('-d');
  }

  composeOptions.push('-t', DOCKER_TIMEOUT_SECONDS, '--no-deps', options.service);

  try {
    await bashService.exec(DOCKER_COMPOSE_COMMAND, composeOptions, options);
  } catch (error) {
    throw new DockerComposeError('Unable to start service: ' + options.service, error);
  }
}

async function dockerLogin(options = {}, username, password) {

  addDefaultOptions(options);
  options.env = await injectSettings();

  var composeOptions = ['login', '--username', username, '--password', password];

  try {
    await bashService.exec(DOCKER_COMMAND, composeOptions, options);
  } catch (error) {
    throw new DockerComposeError('Unable to login to docker: ', error);
  }
}

async function dockerLoginCasabuilder() {

  if (process.env.CASABUILDER_PASSWORD) {
    await dockerLogin({}, 'casabuilder', process.env.CASABUILDER_PASSWORD);
  }

}

async function dockerLoginCasaworker() {

  if (process.env.CASAWORKER_PASSWORD) {
    await dockerLogin({}, 'casaworker', process.env.CASAWORKER_PASSWORD);
  }

}

async function dockerLogout(options = {}) {

  addDefaultOptions(options);
  options.env = await injectSettings();
  var composeOptions = ['logout'];

  try {
    await bashService.exec(DOCKER_COMMAND, composeOptions, options);
  } catch (error) {
    throw new DockerComposeError('Unable to login to docker: ', error);
  }
}

module.exports = {
  dockerComposeUp,
  dockerComposePull,
  dockerComposeStop,
  dockerComposeRemove,
  dockerComposeRestart,
  dockerComposeUpSingleService, // eslint-disable-line id-length
  dockerLoginCasaworker,
};
