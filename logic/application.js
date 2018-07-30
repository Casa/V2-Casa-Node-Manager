/*
All business logic goes here.
 */

const dockerLogic = require('../logic/docker.js');
const diskLogic = require('../logic/disk.js');
const _ = require('underscore');

var q = require('q');

const fs = require('fs');
//TODO: add constant for docker
const SETTINGS_FILE = "/settings/settings.json";

function getSettings() {
    var defferred = q.defer();
    fs.readFile(SETTINGS_FILE, 'utf8', function (error, data) {
        if (error) {
            logger.error('Unable to read settings', MODULE, error.toString())
            defferred.reject(error.toString());
        }
        const configJSON = JSON.parse(data);
        defferred.resolve(configJSON);
    });

    return defferred.promise;
}
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


/*
Gets all applications available to install. You can filter by application name and chain.
 */
function getUninstallAvailable(application, chain) {

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
  diskLogic.getInstalledApplicationNames()
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

// Promise chain, need unpack the object
function packedInstall(info) {
  var defered = q.defer();

  function handleSuccess() {
    defered.resolve();
  }

  function handleError(error) {
    defered.reject(error);
  }

  install(info.container, '', info.chain)
    .then(handleSuccess)
    .catch(handleError);

  return defered.promise;
}

// name != chain for data-transfer container
function install(name, network, chain) {
  var deferred = q.defer();

  network = network || '';
  var fileName = '';

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

    fileName = applications[0];
  }

  function ensureApplicationNotInstalled() {

    var deferred2 = q.defer();

    var applicationName = fileName;
    if(network !== '') {
      var parts = fileName.split('.');
      applicationName = parts[0] + '-' + network + '.' + parts[1];
    }

    function handleSuccess(applicationNames) {

      for(let i = 0; i < applicationNames.length; i++) {
        if(applicationName === applicationNames[i]) {
          //an existing image is found. We should not install this application again.
          deferred2.reject({
            code: 'APPLICATION_ALREADY_INSTALLED',
            text: 'Application has already been installed: ' + applicationName
          });
          return;
        }
      }

      //an existing image is not found. We should install this application.
      deferred2.resolve(fileName);
    }

    //TODO this is not handling errors properly
    function handleError(error) {
      deferred2.reject(error);
    }

    diskLogic.getInstalledApplicationNames(applicationName)
      .then(handleSuccess)
      .catch(handleError);

    return deferred2.promise;
  }

  function copyFileToInstallDir() {
    var toFileName = fileName;
    if(network !== '') {
      var parts = fileName.split('.');
      toFileName = parts[0] + '-' + network + '.' + parts[1];
    }
    return diskLogic.copyFileToInstallDir(fileName, toFileName);
  }

  /*
  Pass options to docker compose up. These will typically be environment variables.
   */
  function passOptions(settings) {
    var lndSettings = settings['lnd'];
    var bitcoindSettings = settings['bitcoind'];

    var envData = {};
    Object.keys(lndSettings).forEach(function (key) {
        envData[key.toUpperCase()] = lndSettings[key];
    });

    Object.keys(bitcoindSettings).forEach(function (key) {
        envData[key.toUpperCase()] = bitcoindSettings[key];
    });

    return {
      fileName: 'docker-compose.yml',
      env: envData
    };
  }

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  //getAvailable(name, network)
   // .then(ensureOneApplicationAvailable)
   // .then(ensureApplicationNotInstalled)
   // .then(diskLogic.copyFileToWorkingDir)
   // .then(dockerLogic.getCurrentComposeFileImageName)
    //.then(dockerLogic.pullImage)
    getSettings()
    .then(passOptions)
    .then(dockerLogic.dockerComposeUp)
   // .then(copyFileToInstallDir)
   // .then(diskLogic.deleteFileInWorkingDir)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

function uninstall(application, network) {
  var deferred = q.defer();

  network = network || '';
  var fileName = '';

  //TODO this function is duplicated
  function ensureOneApplicationAvailable(applications) {

    var applicationsFound = 0;
    for(let i = 0; i < applications.length; i++) {
      if(applications[i].includes(application)) {
        applicationsFound++;
      }
    }

    if(applicationsFound === 0) {
      throw {
        code: 'NO_APPLICATION_FOUND',
        text: 'There are no applications that meet the given specifications.'
      }
    } else if(applicationsFound > 1) {
      throw {
        code: 'MULTIPLE_APPLICATIONS_FOUND',
        text: 'Multiple applications meet the given specifications. Please be more specific.'
      }
    }

    fileName = applications[0];
  }

  function removeVolume() {
    return dockerLogic.removeVolume('applications_' + application + '-data');
  }

  /*
  Pass options to docker compose up. These will typically be environment variables.
 */
  function passOptions() {
    return {
      fileName: application + '.yml',
      env: {
        NETWORK: network
      }};
  }

  //TODO clean this process way up. It's gross
  function replaceVersion(string) {
    return string.replace('${VERSION}', process.env.VERSION);
  }

  function getComposeFileImageName() {
    return dockerLogic.getInstalledComposeFileImageName(fileName)
      .then(replaceVersion)
  }

  function removeFileFromInstallDir() {
    return diskLogic.deleteFileInInstalledDir(fileName);
  }

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  diskLogic.getInstalledApplicationNames()
    .then(ensureOneApplicationAvailable)
    .then(passOptions)
    .then(dockerLogic.dockerComposeDown)
    .then(getComposeFileImageName)
    .then(dockerLogic.removeImage)
    .then(removeVolume)
    .then(removeFileFromInstallDir)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

module.exports = {
  getAvailable: getAvailable,
  getUninstallAvailable: getUninstallAvailable,
  //start: start,
  //stop: stop,
  install: install,
  packedInstall: packedInstall,
  uninstall: uninstall
};