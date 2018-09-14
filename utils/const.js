/* eslint-disable id-length */
const os = require('os');
const UUID = require('utils/UUID');

module.exports = {
  DOCKER_USERNAME_ENCRYPTED: '65b56859fe5d1490c39b',
  DOCKER_PASSWORD_ENCRYPTED: '3eb2286ad05402b8cbad82f4357790ef41f1746d',
  LIGHTNING_NODE_DOCKER_COMPOSE_FILE: 'lightning-node.yml',
  LOGGING_DOCKER_COMPOSE_FILE: 'logspout.yml',
  NODE_LOG_ARCHIVE: 'casa-lightning-node-logs.tar.bz2',
  REQUEST_CORRELATION_NAMESPACE_KEY: 'manager-request',
  REQUEST_CORRELATION_ID_KEY: 'reqId',
  SERIAL: process.env.SYSLOG_TAG || 'UNKNOWN',
  SETTINGS_FILE: process.env.SETTINGS_FILE || os.homedir() + '/lightning-node/settings.json',
  SHARED_JWT_SECRET: process.env.SHARED_JWT_SECRET || 'GK' + UUID.fetchBootUUID(),
  TAG: process.env.TAG || 'arm',
  LOGGING_SERVICES: ['syslog', 'papertrail', 'logspout']
};
