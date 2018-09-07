var q = require('q'); // eslint-disable-line id-length
var rp = require('request-promise');

function updateSettings(enabled) {
  var data = {remoteLogging: enabled};

  const postOptions = {
    method: 'POST',
    uri: 'http://0.0.0.0:3002/v1/settings/update-remote-logging',
    body: data,
    json: true
  };

  var deferred = q.defer();

  function handleSuccess() {
    deferred.resolve();
  }

  function handleError(error) {
    deferred.reject(error);
  }

  rp(postOptions)
    .then(handleSuccess)
    .catch(handleError);

  return deferred.promise;
}

module.exports = {
  updateSettings,
};
