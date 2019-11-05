const axios = require('axios');
const constants = require('utils/const.js');

const authenticationBaseUrl = 'https://auth.docker.io';
const registryBaseUrl = 'https://registry.hub.docker.com';

function getAuthenticationToken(repository) {

  const config = {
    headers: {},
  };

  // Use casabuilder password if it exists.
  if (process.env.CASABUILDER_PASSWORD) {
    config.headers.Authorization = 'Basic ' + Buffer.from(constants.CASABUILDER_USERNAME + ':'
      + process.env.CASABUILDER_PASSWORD).toString('base64');
  }

  return axios.get(authenticationBaseUrl + '/token?service=registry.docker.io&scope=repository:casanode'
    + process.env.REPOSITORY_ADDENDUM + '/' + repository + ':pull', config);
}

function getDigest(token, repository, tagVersion) {
  const config = {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.docker.distribution.manifest.v2+json',
    }
  };

  return axios.get(registryBaseUrl + '/v2/casanode' + process.env.REPOSITORY_ADDENDUM + '/' + repository + '/manifests/'
    + tagVersion, config);
}

module.exports = {
  getAuthenticationToken,
  getDigest,
};
