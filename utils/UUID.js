const bashService = require('services/bash.js');
const uuidv4 = require('uuid/v4');

function fetchBootUUID() {
  return bashService.exec('cat', ['/proc/sys/kernel/random/boot_id']);
}

module.exports = {
  create: uuidv4,
  fetchBootUUID,
};
