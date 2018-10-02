const constants = require('utils/const.js');
const diskService = require('services/disk.js');

function readSettingsFile() {
  return diskService.readJsonFile(constants.SETTINGS_FILE);
}

function writeSettingsFile(data) {
  return diskService.writeJsonFile(constants.SETTINGS_FILE, data);
}

function settingsFileExists() {
  return diskService.readJsonFile(constants.SETTINGS_FILE);
}

module.exports = {
  readSettingsFile,
  writeSettingsFile,
  settingsFileExists,
};
