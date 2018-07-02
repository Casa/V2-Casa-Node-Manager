const docker = require('../services/docker.js');
const disk = require('../services/disk.js');

var q = require('q');

function start(application) {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  if(application === 'bitcoin') {
    docker.pullImage('google/cadvisor:latest')
      .then(docker.getImage)
      .then(docker.runImage)
      .then(handleSuccess)
      .catch(handleError)
  } else {
    deferred.reject('unknown application: ' + application)
  }

  return deferred.promise;
}

function stop(application) {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  if(application === 'bitcoin') {
    docker.stop('3bc4cc0ed2a1')
      .then(handleSuccess)
      .catch(handleError)
  } else {
    deferred.reject('unknown application: ' + application)
  }

  return deferred.promise;
}

/*
Install an image to this device.

//TODO provision space and permissions on hard drive.
 */
function install(application) {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  //TODO make this more generic.
  //how should we handle mulitple implementations of chains
  if(application === 'bitcoin') {
    disk.copyFileToWorkingDir('bitcoind-testnet')
      .then(docker.dockerComposeUp)
      .then(disk.deleteFileInWorkingDir)
      .then(handleSuccess)
      .catch(handleError)
  } else if (application === 'hello-world') {
    disk.copyFileToWorkingDir('hello-world')
      .then(docker.dockerComposeUp)
      .then(disk.deleteFileInWorkingDir)
      .then(handleSuccess)
      .catch(handleError)
  } else if (application === 'litecoin') {
    disk.copyFileToWorkingDir('litecoind-testnet')
      .then(docker.dockerComposeUp)
      .then(disk.deleteFileInWorkingDir)
      .then(handleSuccess)
      .catch(handleError)
  } else if (application === 'plex') {
    disk.copyFileToWorkingDir('plex')
      .then(docker.dockerComposeUp)
      .then(disk.deleteFileInWorkingDir)
      .then(handleSuccess)
      .catch(handleError)
  } else {
    deferred.reject('unknown application: ' + application)
  }

  return deferred.promise;
}

function uninstall(application) {
  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  if(application === 'bitcoin') {
    docker.stop('3bc4cc0ed2a1')
      .then(handleSuccess)
      .catch(handleError)
  } else {
    deferred.reject('unknown application: ' + application)
  }

  return deferred.promise;
}

module.exports = {
  start: start,
  stop: stop,
  install: install,
  uninstall: uninstall
};