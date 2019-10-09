const constants = require('utils/const.js');
const diskService = require('services/disk.js');

async function deleteUserFile() {
  return await diskService.deleteFile(constants.USER_PASSWORD_FILE);
}

async function deleteFoldersInDir(directory) {
  await diskService.deleteFoldersInDir(directory);
}

async function fileExists(path) {
  return diskService.readJsonFile(path)
    .then(() => Promise.resolve(true))
    .catch(() => Promise.resolve(false));
}

async function getBuildDetails(appsToLaunch) {

  const details = [];

  for (const applicationName of Object.keys(appsToLaunch)) {
    const application = {};
    application.name = applicationName;
    application.metadata = await diskService.readJsonFile(constants.WORKING_DIRECTORY + '/'
      + application.name + '/' + appsToLaunch[application.name].version + '/' + constants.METADATA_FILE);
    application.ymlPath = constants.WORKING_DIRECTORY + '/' + application.name + '/'
      + appsToLaunch[application.name].version + '/' + application.name + '.yml';
    details.push(application);
  }

  return details;
}

async function listVersionsForApp(app) {
  return await diskService.listDirsInDir(constants.WORKING_DIRECTORY + '/' + app);
}

async function moveFoldersToDir(fromDir, toDir) {
  await diskService.moveFoldersToDir(fromDir, toDir);
}

async function writeAppVersionFile(application, json) {
  return diskService.writeJsonFile(constants.WORKING_DIRECTORY + '/' + application, json);
}

function readUserFile() {
  return diskService.readJsonFile(constants.USER_PASSWORD_FILE);
}

function readSettingsFile() {
  return diskService.readJsonFile(constants.SETTINGS_FILE);
}

function writeSettingsFile(json) {
  return diskService.writeJsonFile(constants.SETTINGS_FILE, json);
}

async function writeUserFile(json) {
  return diskService.writeJsonFile(constants.USER_PASSWORD_FILE, json);
}

function settingsFileExists() {
  return diskService.readJsonFile(constants.SETTINGS_FILE)
    .then(() => Promise.resolve(true))
    .catch(() => Promise.resolve(false));
}

function hiddenServiceFileExists() {
  return readHiddenService()
    .then(() => Promise.resolve(true))
    .catch(() => Promise.resolve(false));
}

async function readAppVersionFile(application) {
  return diskService.readJsonFile(constants.WORKING_DIRECTORY + '/' + application);
}

function readHiddenService() {
  return diskService.readFile(constants.CASA_NODE_HIDDEN_SERVICE_FILE);
}

function readJWTPrivateKeyFile() {
  return diskService.readFile(constants.JWT_PRIVATE_KEY_FILE);
}

function readJWTPublicKeyFile() {
  return diskService.readFile(constants.JWT_PUBLIC_KEY_FILE);
}

function writeJWTPrivateKeyFile(data) {
  return diskService.writeKeyFile(constants.JWT_PRIVATE_KEY_FILE, data);
}

function writeJWTPublicKeyFile(data) {
  return diskService.writeKeyFile(constants.JWT_PUBLIC_KEY_FILE, data);
}


// Send a signal to shutdown the Casa Node.
async function shutdown() {
  await diskService.writeFile(constants.SHUTDOWN_SIGNAL_FILE, 'true');
}

// Send a signal to relaunch the manager.
async function relaunch() {
  await diskService.writeFile(constants.RELAUNCH_SIGNAL_FILE, 'true');
}

module.exports = {
  deleteUserFile,
  deleteFoldersInDir,
  moveFoldersToDir,
  fileExists,
  getBuildDetails,
  listVersionsForApp,
  readSettingsFile,
  readUserFile,
  writeAppVersionFile,
  writeSettingsFile,
  writeUserFile,
  settingsFileExists,
  hiddenServiceFileExists,
  readAppVersionFile,
  readHiddenService,
  readJWTPrivateKeyFile,
  readJWTPublicKeyFile,
  writeJWTPrivateKeyFile,
  writeJWTPublicKeyFile,
  shutdown,
  relaunch,
};
