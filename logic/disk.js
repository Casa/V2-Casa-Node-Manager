/*
All business logic for disk manager goes here.
 */

const diskService = require('../services/disk.js');

const All_YAMLS_DIR = '/usr/local/applications';
const INSTALLED_DIR = '/usr/local/installed';
const DEFAULT_DOCKER_COMPOSE_FILE_NAME = 'docker-compose.yaml';

/**
 * Public
 * Copy file to the install directory.
 * @param fileName
 * @returns {*}
 */
function copyFileToInstallDir(fromFileName, toFileName) {
  return diskService.copyFile(All_YAMLS_DIR + '/' + fromFileName, INSTALLED_DIR + '/' + toFileName);
}

function deleteFileInInstalledDir(fileName) {
  return diskService.deleteFile(INSTALLED_DIR + '/' + fileName);
}

function getAllApplicationNames() {
  return diskService.getFileNamesInDirectory(All_YAMLS_DIR);
}

function getInstalledApplicationNames() {
  return diskService.getFileNamesInDirectory(INSTALLED_DIR);
}

/**
 * Public
 * Returns the contents of the file in the current docker compose directory.
 * @returns {*}
 */
function readCurrentDockerComposeFile() {
  return readDockerComposeFile(All_YAMLS_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME);
}

/**
 * Private
 * Returns the contents of the file at the given location.
 * @param path
 * @returns {*}
 */
function readDockerComposeFile(path) {
  return diskService.readFile(path);
}

/**
 * Public
 * Returns the contents the given file in the installed directory.
 * @param fileName
 * @returns {*}
 */
function readInstalledDockerComposeFile(fileName) {
  return readDockerComposeFile(INSTALLED_DIR + '/' + fileName);
}

module.exports = {
  copyFileToInstallDir: copyFileToInstallDir,
  deleteFileInInstalledDir: deleteFileInInstalledDir,
  getAllApplicationNames: getAllApplicationNames,
  getInstalledApplicationNames: getInstalledApplicationNames,
  readCurrentDockerComposeFile: readCurrentDockerComposeFile,
  readInstalledDockerComposeFile: readInstalledDockerComposeFile
};