/*
All business logic goes here.
 */

const dockerLogic = require('../logic/docker.js');
const diskLogic = require('../logic/disk.js');
const _ = require('underscore');

var q = require('q');

/*
Gets all applications available to install. You can filter by application name and chain.
 */
function getAvailable(application, network) {

  application = application || '';
  network = network || '';

  var deferred = q.defer();

  function handleSuccess(applicationNames) {

    var fileredList = [];

    //TODO we should verify network somehow
    //I think we should add a config file along side the yaml which has meta data about the application
    //then verify it here

    _.each(applicationNames, function(applicationName) {
      if(applicationName.includes(application)) {
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
function install(name, network) {
  var deferred = q.defer();

  network = network || '';

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

    var deferred2 = q.defer();

    function handleSuccess() {
      //an existing image is found. We should not install this application again.
      deferred2.reject({
        code: 'APPLICATION_ALREADY_INSTALLED',
        text: 'Application has already been installed: ' + fileName
      });
    }

    function handleError() {
      //an existing image is not found. We should install this application.
      deferred2.resolve(fileName);
    }

    //example chain fileName bitcoind_testnet.yml
    //example application fileName = plex.yml
    var dockerContainerName = fileName.split('.')[0];
    //switch - for _
    dockerContainerName = dockerContainerName.replace('-', '_');

    dockerLogic.getContainer(dockerContainerName)
      .then(handleSuccess)
      .catch(handleError);

    return deferred2.promise;
  }

  /*
  Pass options to docker compose up. These will typically be environment variables.
   */
  function passOptions() {
    return { env: {
        NETWORK: network
      }};
  }

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  getAvailable(name, network)
    .then(ensureOneApplicationAvailable)
    .then(ensureApplicationNotInstalled)
    .then(diskLogic.copyFileToWorkingDir)
    .then(dockerLogic.getCurrentComposeFileImageName)
    //.then(dockerLogic.pullImage)
    .then(passOptions)
    .then(dockerLogic.up)
    .then(diskLogic.deleteFileInWorkingDir)
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