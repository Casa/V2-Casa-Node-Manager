/*
All business logic for disk manager goes here.
 */

const diskService = require('../services/disk.js');

const All_YAMLS_DIR = '/usr/local/all-app-yamls';
const INSTALLED_DIR = '/usr/local/installed';
const WORKING_DIR = '/usr/local/current-app-yaml';
const DEFAULT_DOCKER_COMPOSE_FILE_NAME = 'docker-compose.yaml';

/**
 * Public
 * Copy the default docker-compose.yml file from the working directory to the install directory. Use the given file
 * name as the new file name.
 * @param fileName
 * @returns {*}
 */
function copyFileToInstallDir(fileName) {
  return diskService.copyFile(WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME, INSTALLED_DIR + '/' + fileName);
}

function copyFileToWorkingDir(fileName) {
  return diskService.copyFile(All_YAMLS_DIR + '/' + fileName, WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME);
}

function deleteFileInWorkingDir() {
  return diskService.deleteFile(WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME);
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
  return readDockerComposeFile(WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME);
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
  copyFileToWorkingDir: copyFileToWorkingDir,
  deleteFileInInstalledDir: deleteFileInInstalledDir,
  deleteFileInWorkingDir: deleteFileInWorkingDir,
  getAllApplicationNames: getAllApplicationNames,
  getInstalledApplicationNames: getInstalledApplicationNames,
  readCurrentDockerComposeFile: readCurrentDockerComposeFile,
  readInstalledDockerComposeFile: readInstalledDockerComposeFile
};