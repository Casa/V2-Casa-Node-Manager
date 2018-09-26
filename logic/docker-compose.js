var q = require('q'); // eslint-disable-line id-length
const publicIp = require('public-ip');
const decamelizeKeys = require('decamelize-keys');

const bashService = require('services/bash.js');
const constants = require('utils/const.js');
const encryption = require('utils/encryption.js');
const DockerComposeError = require('models/errors').DockerComposeError;
const diskLogic = require('logic/disk.js');

const WORKING_DIR = '/usr/local/applications';
const DOCKER_COMPOSE_COMMAND = 'docker-compose';
const DOCKER_COMMAND = 'docker';

const EXTERNAL_IP_KEY = 'EXTERNAL_IP';

const injectSettings = async() => {

  const data = await diskLogic.readSettingsFile(constants.SETTINGS_FILE);
  const settings = JSON.parse(data);

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

  // If the settings file already has an external ip that has been manually set by the user, we should not try to
  // automatically discover the external ip address.
  if (!Object.prototype.hasOwnProperty.call(envData, EXTERNAL_IP_KEY)) {
    envData[EXTERNAL_IP_KEY] = await publicIp.v4();
  }

  return envData;
};


function composeFile(options) {
  if (options !== undefined && options.fileName !== undefined) {
    return WORKING_DIR + '/' + options.fileName;
  }

  return WORKING_DIR + '/' + constants.LIGHTNING_NODE_DOCKER_COMPOSE_FILE;
}

function addDefaultOptions(options) {
  options.cwd = WORKING_DIR;
  options.log = true;
  options.env = options.env || {};
  options.env.TAG = constants.TAG;
}

async function dockerComposeUp(options) {
  const file = composeFile(options);

  addDefaultOptions(options);
  options.env = await injectSettings();

  const composeOptions = ['-f', file, 'up', '-d'];

  try {
    await bashService.exec(DOCKER_COMPOSE_COMMAND, composeOptions, options);
  } catch (error) {
    throw new DockerComposeError('Unable to start services', error);
  }
}


function dockerComposePull(options = {}) {
  var deferred = q.defer();

  const file = composeFile(options);
  const service = options.service;
  addDefaultOptions(options);

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  bashService.exec(DOCKER_COMPOSE_COMMAND, ['-f', file, 'pull', service], options)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function dockerComposeStop(options = {}) {
  var deferred = q.defer();

  const file = composeFile(options);
  const service = options.service;
  addDefaultOptions(options);


  var composeOptions = ['-f', file, 'stop', service];

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

const dockerComposeUpSingleService = async options => { // eslint-disable-line id-length
  const file = composeFile(options);
  const service = options.service;
  addDefaultOptions(options);
  options.env = await injectSettings();
  var composeOptions = ['-f', file, 'up'];

  // By default everything will run in detached mode. However, in some cases we want to want for a container to complete
  // before returning. We pass the attached flag in that instance.
  if (!options.attached) {
    composeOptions.push('-d');
  }

  composeOptions.push('--no-deps', service);

  try {
    await bashService.exec(DOCKER_COMPOSE_COMMAND, composeOptions, options);
  } catch (error) {
    throw new DockerComposeError('Unable to start service: ' + service, error);
  }
};

async function dockerLogin(options = {}) {

  addDefaultOptions(options);
  options.env = await injectSettings();
  const casaworkerUsername = encryption.decryptCasaworker(constants.CASAWORKER_USERNAME_ENCRYPTED);
  const casaworkerPassword = encryption.decryptCasaworker(constants.CASAWORKER_PASSWORD_ENCRYPTED);
  var composeOptions = ['login', '--username', casaworkerUsername, '--password', casaworkerPassword];

  try {
    await bashService.exec(DOCKER_COMMAND, composeOptions, options);
  } catch (error) {
    throw new DockerComposeError('Unable to login to docker: ', error);
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
  dockerComposeUpSingleService, // eslint-disable-line id-length
  dockerLogin,
  dockerLogout,
};
