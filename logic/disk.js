const constants = require('utils/const.js');
const diskService = require('services/disk.js');

function readSettingsFile() {
  return diskService.readFile(constants.SETTINGS_FILE);
}

function writeSettingsFile(data) {
  return diskService.writeFileSync(constants.SETTINGS_FILE, data);
}

function settingsFileExists() {
  return diskService.fileExistsSync(constants.SETTINGS_FILE);
}

module.exports = {
  readSettingsFile,
  writeSettingsFile,
  settingsFileExists,
};
