// DockerHub.js
// Responsible for all network calls to docker hub.

const request = require('request-promise');
var q = require('q'); // eslint-disable-line id-length
const DockerHubError = require('models/errors.js').DockerHubError;

const authenticationBaseUrl = 'https://auth.docker.io';
const registryBaseUrl = 'https://registry.hub.docker.com';

function getAuthenticationToken(organization, repository, username, password) {
  var deferred = q.defer();

  var headers = {
    Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
  };

  const options = {
    headers: headers, // eslint-disable-line object-shorthand
    method: 'GET',
    uri: authenticationBaseUrl + '/token?service=registry.docker.io&scope=repository:' + organization
      + '/' + repository + ':pull',
    json: true,
  };

  request(options)
    .then(function(response) {

      if (response.token) {
        deferred.resolve(response.token);
      } else {
        deferred.reject(new DockerHubError('Unable to parse authentication token'));
      }
    })
    .catch(function(error) {
      deferred.reject(new DockerHubError('Unable to fetch authentication token', error));
    });

  return deferred.promise;
}

function getDigest(authToken, organization, repository, tag) {
  var deferred = q.defer();

  const headers = {
    Authorization: 'Bearer ' + authToken,
    Accept: 'application/vnd.docker.distribution.manifest.v2+json',
  };

  const options = {
    headers: headers, // eslint-disable-line object-shorthand
    method: 'GET',
    uri: registryBaseUrl + '/v2/' + organization + '/' + repository + '/manifests/' + tag,
    json: true,
  };

  request(options)
    .then(function(response) {
      if (response.config && response.config.digest) {
        deferred.resolve(response.config.digest);
      } else {
        deferred.reject(new DockerHubError('Unable to parse digest for ' + organization + '/' + repository
          + '/manifests/' + tag));
      }
    })
    .catch(function(error) {
      deferred.reject(new DockerHubError('Unable to fetch authentication token', error));
    });

  return deferred.promise;
}

module.exports = {
  getAuthenticationToken,
  getDigest,
};
