/* eslint-disable id-length */
const os = require('os');
const UUID = require('@utils/UUID');

module.exports = {
  REQUEST_CORRELATION_NAMESPACE_KEY: 'manager-request',
  REQUEST_CORRELATION_ID_KEY: 'reqId',
  SETTINGS_FILE: process.env.SETTINGS_FILE || os.homedir() + '/lightning-node/settings.json',
  LIGHTNING_NODE_DOCKER_COMPOSE_FILE: 'lightning-node.yml',
  SHARED_JWT_SECRET: process.env.SHARED_JWT_SECRET || 'GK' + UUID.fetchBootUUID(),
  TAG: process.env.TAG || 'arm'
};
