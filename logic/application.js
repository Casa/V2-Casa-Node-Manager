/*
All business logic goes here.
 */
var q = require('q'); // eslint-disable-line id-length
const publicIp = require('public-ip');
const dockerComposeLogic = require('@logic/docker-compose.js');
const diskLogic = require('@logic/disk.js');
const constants = require('@utils/const.js');
const errors = require('@models/errors.js');
const DockerComposeError = errors.DockerComposeError;
const bashService = require('@services/bash.js');

const EXTERNAL_IP_KEY = 'EXTERNALIP';

const start = async() => {

  const data = await diskLogic.readSettingsFile(constants.SETTINGS_FILE);
  const settings = JSON.parse(data);

  var lndSettings = settings['lnd'];
  var bitcoindSettings = settings['bitcoind'];

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

  try {
    await dockerComposeLogic.dockerComposeUp({
      env: envData
    });
  } catch (error) {
    throw new DockerComposeError('Unable to start services');
  }
};

function shutdown() {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(new DockerComposeError('Unable to shutdown services', error));
  }

  dockerComposeLogic.dockerComposeDown()
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
    deferred.reject(new DockerComposeError('Unable to reset device', error));
  }

  dockerComposeLogic.dockerComposeDown()
    .then(wipeSettingsVolume)
    .then(createSettingsFile)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function pull(service) {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  dockerComposeLogic.dockerComposePull(service)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function restart(service) {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(new DockerComposeError('Unable to restart service', error));
  }

  dockerComposeLogic.dockerComposeRestart(service)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function update(service) {
  var deferred = q.defer();

  function injectService() {
    return service;
  }

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(new DockerComposeError('Unable to update service', error));
  }

  dockerComposeLogic.dockerComposePull(service)
    .then(injectService)
    .then(dockerComposeLogic.dockerComposeStop)
    .then(injectService)
    .then(dockerComposeLogic.dockerComposeRemove)
    .then(injectService)
    .then(dockerComposeLogic.dockerComposeUpSingleService)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

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
    }
  };

  if (!diskLogic.settingsFileExists(constants.SETTINGS_FILE)) {
    diskLogic.writeSettingsFile(constants.SETTINGS_FILE, JSON.stringify(defaultConfig));
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

  bashService.exec('rm', ['-rf', 'settings.json', 'user.json'], options)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

module.exports = {
  start,
  shutdown,
  reset,
  pull,
  restart,
  update,
  createSettingsFile,
};
