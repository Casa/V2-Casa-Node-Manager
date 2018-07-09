/*
All business logic for disk manager goes here.
 */

const diskService = require('../services/disk.js');

var q = require('q');

const All_YAMLS_DIR = '/usr/local/all-app-yamls';
const INSTALLED_DIR = '/usr/local/installed';
const WORKING_DIR = '/usr/local/current-app-yaml';
const DEFAULT_DOCKER_COMPOSE_FILE_NAME = 'docker-compose.yaml';

function copyFileToInstallDir(fileName) {
  return diskService.copyFile(WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME, INSTALLED_DIR + '/' + fileName);
}

function copyFileToWorkingDir(fileName) {
  return diskService.copyFile(All_YAMLS_DIR + '/' + fileName, WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME);
}

function deleteFileInWorkingDir() {
  return diskService.deleteFile(WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME)
}

function getAllApplicationNames() {
  return diskService.getFileNamesInDirectory(All_YAMLS_DIR);
}

function getInstalledApplicationNames() {
  return diskService.getFileNamesInDirectory(INSTALLED_DIR);
}

function readCurrentDockerComposeFile() {
  return diskService.readFile(WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE_FILE_NAME);
}

module.exports = {
  copyFileToInstallDir: copyFileToInstallDir,
  copyFileToWorkingDir: copyFileToWorkingDir,
  deleteFileInWorkingDir: deleteFileInWorkingDir,
  getAllApplicationNames: getAllApplicationNames,
  getInstalledApplicationNames: getInstalledApplicationNames,
  readCurrentDockerComposeFile: readCurrentDockerComposeFile
};