/*
All business logic goes here.
 */
var q = require('q'); // eslint-disable-line id-length
const dockerComposeLogic = require('../logic/docker-compose.js');
const diskLogic = require('../logic/disk.js');
const constants = require('../resources/const.js');
const DockerComposeError = require('../resources/errors.js').DockerComposeError;

function start() {
  var deferred = q.defer();

  function loadSettings(data) {
    const settings = JSON.parse(data);

    var lndSettings = settings['lnd'];
    var bitcoindSettings = settings['bitcoind'];

    var envData = {};
    Object.keys(lndSettings).forEach(function(key) {
      envData[key.toUpperCase()] = lndSettings[key];
    });

    Object.keys(bitcoindSettings).forEach(function(key) {
      envData[key.toUpperCase()] = bitcoindSettings[key];
    });

    return {
      env: envData
    };
  }

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError() {
    deferred.reject(new DockerComposeError('Unable to start services'));
  }

  diskLogic.readSettingsFile(constants.SETTINGS_FILE)
    .then(loadSettings)
    .then(dockerComposeLogic.dockerComposeUp)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function shutdown() {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError() {
    deferred.reject(new DockerComposeError('Unable to shutdown services'));
  }

  dockerComposeLogic.dockerComposeDown()
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function reset() {
  var deferred = q.defer();

  const options = {
    reset: true
  };

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError() {
    deferred.reject(new DockerComposeError('Unable to reset device'));
  }

  dockerComposeLogic.dockerComposeDown(options)
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

  function handleError() {
    deferred.reject(new DockerComposeError('Unable to restart service'));
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

  function handleError() {
    deferred.reject(new DockerComposeError('Unable to update service'));
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

module.exports = {
  start,
  shutdown,
  reset,
  pull,
  restart,
  update,
};
