const dockerLogic = require('../logic/docker.js');
const diskLogic = require('../logic/disk.js');
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
  diskLogic.getAllApplicationNames()
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}


//TODO cleanup
/*
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
*/

/*
Install an image to this device.

//TODO provision space and permissions on hard drive.
 */
function install(name, chain) {
  var deferred = q.defer();

  chain = chain || '';

  function ensureOneApplicationAvailable(applications) {
    if(applications.length === 0) {
      throw {
        code: 'NO_APPLICATION_FOUND',
        text: 'There are no applications that meet the given specifications.'
      }
    } else if(applications.length > 1) {
      throw {
        code: 'MULTIPLE_APPLICATIONS_FOUND',
        text: 'Multiple applications meet the given specifications. Please be more specific.'
      }
    }

    return applications[0];
  }

  function ensureApplicationNotInstalled(fileName) {
    //example chain fileName bitcoind_testnet.yml
    //example application fileName = plex.yml
    const dockerContainerName = fileName.split('.')[0];
    return dockerLogic.getContainer(dockerContainerName);
  }

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  getAvailable(name, chain)
    .then(ensureOneApplicationAvailable)
    .then(ensureApplicationNotInstalled)
    .then(disk.copyFileToWorkingDir)
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
  //start: start,
  //stop: stop,
  install: install,
  uninstall: uninstall
};