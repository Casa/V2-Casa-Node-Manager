/*
All business logic for disk manager goes here.
 */

const diskService = require('../services/disk.js');

var q = require('q');

const All_YAMLS_DIR = '/usr/local/all-app-yamls';
const WORKING_DIR = '/usr/local/current-app-yaml';
const DEFAULT_DOCKER_COMPOSE__FILE_NAME = 'docker-compose.yaml';

function copyFileToWorkingDir(fileName) {
  return diskService.copyFile(All_YAMLS_DIR + '/' + fileName, WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE__FILE_NAME);
}

function deleteFileInWorkingDir() {
  return diskService.deleteFile(WORKING_DIR + '/' + DEFAULT_DOCKER_COMPOSE__FILE_NAME)
}

function getAllApplicationNames() {
  return diskService.getFileNamesInDirectory(All_YAMLS_DIR);
}

module.exports = {
  copyFileToWorkingDir: copyFileToWorkingDir,
  deleteFileInWorkingDir: deleteFileInWorkingDir,
  getAllApplicationNames: getAllApplicationNames
};