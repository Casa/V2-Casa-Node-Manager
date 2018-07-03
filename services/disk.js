/*
All disk manager code goes here.
 */

var q = require('q');
var rl = require('readline');
var fs = require('fs');

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

function getFileNamesInDirectory(directory) {
  var deferred = q.defer();

  fs.readdir(directory, function(error, files) {

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
  copyFile: copyFile,
  deleteFile: deleteFile,
  getFileNamesInDirectory: getFileNamesInDirectory,
  getDeviceSerial: getDeviceSerial
};