/* eslint-disable */
var q = require('q');
const bashService = require('services/bash.js');

function create() {
  return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function fetchBootUUID() {
  var deferred = q.defer();

  function handleSuccess(uuid) {
    deferred.resolve(uuid);
  }

  function handleError(error) {
    deferred.reject(error);
  }

  bashService.exec('cat', ['/proc/sys/kernel/random/boot_id'])
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

module.exports = {
  create,
  fetchBootUUID,
};
