const diskService = require('@services/disk.js');

function readSettingsFile(path) {
  return diskService.readFile(path);
}

function writeSettingsFile(path, data) {
  return diskService.writeFileSync(path, data);
}

function settingsFileExists(path) {
  return diskService.fileExistsSync(path);
}

module.exports = {
  readSettingsFile,
  writeSettingsFile,
  settingsFileExists,
};
