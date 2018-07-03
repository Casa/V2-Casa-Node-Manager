var q = require('q');
var rl = require('readline');
var fs = require('fs');

const All_YAMLS_DIR = '/usr/local/all-app-yamls';
const WORKING_DIR = '/usr/local/current-app-yaml';
const DEFAULT_DOCKER_COMPOSE__FILE_NAME = 'docker-compose.yaml';

function copyFile(source, target) {
  var deferred = q.defer();

  var rd = fs.createReadStream(source);
  rd.on("error", function(error) {
    deferred.reject(error);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(error) {
    deferred.reject(error);
  });
  wr.on("close", function(ex) {
    deferred.resolve(ex);
  });
  rd.pipe(wr);

  return deferred.promise;
}

function copyFileToWorkingDir(fileName) {

  return copyFile(All_YAMLS_DIR + '/' + fileName + '.yaml', WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE__FILE_NAME);

}

function deleteFile(filePath) {
  var deferred = q.defer();

  try {
    fs.unlinkSync(filePath);
    deferred.resolve();
  } catch (error) {
    deferred.reject(error);
  }

  return deferred.promise;
}

function deleteFileInWorkingDir() {
  return deleteFile(WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE__FILE_NAME)
}

function getAllApplicationNames() {
  var deferred = q.defer();

  fs.readdir(All_YAMLS_DIR, function(error, files) {

    if(error) {
      deferred.reject(error);
    } else {
      deferred.resolve(files);
    }

  });

  return deferred.promise;
}

function getDeviceSerial() {
  var deferred = q.defer();

  var lineReader = rl.createInterface({
    input: fs.createReadStream('file.in')
  });

  lineReader.on('line', function (line) {
    if(deferred.state === 'pending' && line.includes('Serial')) {
      var serial = line.split(':')[1].trim();
      deferred.resolve(serial);
    }
  });

  return deferred.promise;
}

module.exports = {
  copyFileToWorkingDir: copyFileToWorkingDir,
  deleteFileInWorkingDir: deleteFileInWorkingDir,
  getAllApplicationNames: getAllApplicationNames,
  getDeviceSerial: getDeviceSerial
};