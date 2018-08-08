const diskService = require('../services/disk.js');

function readSettingsFile(path) {
  return diskService.readFile(path);
}

module.exports = {
  readSettingsFile
};
