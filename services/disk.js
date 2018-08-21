/*
All disk manager code goes here.
 */
var q = require('q'); // eslint-disable-line id-length
var rl = require('readline');
var fs = require('fs');

// TODO: need this for logs, right?
function getDeviceSerial() {
  var deferred = q.defer();

  var lineReader = rl.createInterface({
    input: fs.createReadStream('file.in')
  });

  lineReader.on('line', function(line) {
    if (deferred.state === 'pending' && line.includes('Serial')) {
      var serial = line.split(':')[1].trim();
      deferred.resolve(serial);
    }
  });

  return deferred.promise;
}

function readFile(filePath) {
  var deferred = q.defer();

  fs.readFile(filePath, 'utf8', function(error, data) {
    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(data);
    }
  });

  return deferred.promise;
}

// Writes a file sync. Throws an error if file not found.
function writeFileSync(filePath, data) {
  return fs.writeFileSync(filePath, data);
}

function fileExistsSync(path) {
  if (fs.existsSync(path)) {
    return true;
  } else {
    return false;
  }
}


module.exports = {
  getDeviceSerial,
  readFile,
  writeFileSync,
  fileExistsSync,
};
