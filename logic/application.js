const docker = require('../services/docker.js');
const disk = require('../services/disk.js');
const _ = require('underscore');

var q = require('q');

/*
Gets all applications available to install. You can filter by application name and chain.
 */
function getAvailable(application, chain) {

  application = application || '';
  chain = chain || '';

  var deferred = q.defer();

  function handleSuccess(applicationNames) {

    var fileredList = [];

    _.each(applicationNames, function(applicationName) {
      if(applicationName.includes(application) && applicationName.includes(chain)) {
        fileredList.push(applicationName);
      }
    });

    deferred.resolve(fileredList);
  }

  function handleError(error) {
    deferred.reject(error);
  }

  //TODO get from warehouse instead of local disk
  //we need to make the warehouse public first
  disk.getAllApplicationNames()
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

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

  disk.copyFileToWorkingDir(application)
    .then(docker.dockerComposeUp)
    .then(disk.deleteFileInWorkingDir)
    .then(handleSuccess)
    .catch(handleError);

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
  getAvailable: getAvailable,
  start: start,
  stop: stop,
  install: install,
  uninstall: uninstall
};