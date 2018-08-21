const bashService = require('@services/bash.js');
const constants = require('@utils/const.js');

var q = require('q'); // eslint-disable-line id-length

const WORKING_DIR = '/usr/local/applications';
const DOCKER_COMPOSE_COMMAND = 'docker-compose';

const TAG = process.env.TAG || 'arm';

function composeFile(options) {
  if (options.fileName !== undefined) {
    return WORKING_DIR + '/' + options.fileName;
  }

  return WORKING_DIR + '/' + constants.LIGHTNING_NODE_DOCKER_COMPOSE_FILE;
}

function addDefaultOptions(options) {
  options.cwd = WORKING_DIR;
  options.log = true;
  options.env = options.env || {};
  options.env.TAG = TAG;
}

function dockerComposeUp(options = {}) {
  var deferred = q.defer();

  const file = composeFile(options);
  addDefaultOptions(options);

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  bashService.exec(DOCKER_COMPOSE_COMMAND, ['-f', file, 'up', '-d'], options)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function dockerComposeDown(options = {}) {
  var deferred = q.defer();

  const file = composeFile(options);
  addDefaultOptions(options);

  var composeOptions = ['-f', file, 'down'];

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

function dockerComposeRestart(options = {}) {
  var deferred = q.defer();

  const file = composeFile(options);
  const service = options.service;
  addDefaultOptions(options);

  var composeOptions = ['-f', file, 'restart', service];

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

  var composeOptions = ['-f', file, 'rm', service, '-f'];

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

function dockerComposeUpSingleService(options = {}) { // eslint-disable-line id-length
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

  bashService.exec(DOCKER_COMPOSE_COMMAND, ['-f', file, 'up', '-d', '--no-deps', service], options)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

module.exports = {
  dockerComposeDown,
  dockerComposeUp,
  dockerComposePull,
  dockerComposeRestart,
  dockerComposeStop,
  dockerComposeRemove,
  dockerComposeUpSingleService, // eslint-disable-line id-length
};
