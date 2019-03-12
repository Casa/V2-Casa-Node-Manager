const axios = require('axios');
const lnapiUrl = 'http://127.0.0.1';
const lnapiPort = 3002;

async function unlockLnd(password, jwt) {

  const headers = {
    headers: {
      Authorization: 'JWT ' + jwt
    }
  };

  const body = {
    password,
  };

  return axios
    .post(lnapiUrl + ':' + lnapiPort + '/v1/lnd/wallet/unlock', body, headers);
}

module.exports = {
  unlockLnd,
};
