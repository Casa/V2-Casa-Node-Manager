const diskService = require('../services/disk.js');

var q = require('q');

function getAllApplicationNames() {
  return diskService.getAllApplicationNames();
}

module.exports = {
  getAllApplicationNames: getAllApplicationNames
};