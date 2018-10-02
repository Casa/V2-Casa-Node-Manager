const constants = require('utils/const.js');
const diskService = require('services/disk.js');


function readUserFile() {
  return diskService.readJsonFile(constants.USER_PASSWORD_FILE);
}

function readSettingsFile() {
  return diskService.readJsonFile(constants.SETTINGS_FILE);
}

function writeSettingsFile(data) {
  return diskService.writeJsonFile(constants.SETTINGS_FILE, data);
}

function writeUserFile(data) {
  return diskService.writeJsonFile(constants.USER_PASSWORD_FILE, data);
}

function settingsFileExists() {
  return diskService.readJsonFile(constants.SETTINGS_FILE);
}

module.exports = {
  readSettingsFile,
  readUserFile,
  writeSettingsFile,
  writeUserFile,
  settingsFileExists,
};
