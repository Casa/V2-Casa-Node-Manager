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

  let url = authenticationBaseUrl + '/token?service=registry.docker.io&scope=repository:casanode';

  // Add addendum if it exists.
  if (process.env.REPOSITORY_ADDENDUM) {
    url += process.env.REPOSITORY_ADDENDUM;
  }

  url += '/' + repository + ':pull';

  return axios.get(url, config);
}

function getDigest(token, repository, tagVersion) {
  const config = {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.docker.distribution.manifest.v2+json',
    }
  };

  let url = registryBaseUrl + '/v2/casanode';

  // Add addendum if it exists.
  if (process.env.REPOSITORY_ADDENDUM) {
    url += process.env.REPOSITORY_ADDENDUM;
  }

  url += '/' + repository + '/manifests/' + tagVersion;

  return axios.get(url, config);
}

module.exports = {
  getAuthenticationToken,
  getDigest,
};
