/* eslint-disable id-length */
/* eslint-disable no-magic-numbers */
const UUID = require('utils/UUID');

module.exports = {
  CASAWORKER_USERNAME_ENCRYPTED: '65b56859fe5d1490c39b',
  CASAWORKER_PASSWORD_ENCRYPTED: '3eb2286ad05402b8cbad82f4357790ef41f1746d',
  CASABUILDER_USERNAME_ENCRYPTED: 'd04730f937ca5eee91eeee',
  CASABUILDER_PASSWORD_ENCRYPTED: 'eb4126aa13c75cb1b0c8f4773d8071fa786774e6',
  COMPOSE_FILES: {
    DEVICE_HOST: 'device-host.yml',
    LIGHTNING_NODE: 'lightning-node.yml',
    LOGSPOUT: 'logspout.yml',
    MANAGER: 'manager.yml',
  },
  WORKING_DIRECTORY: '/usr/local/casa/applications',
  LOGGING_DOCKER_COMPOSE_FILE: 'logspout.yml',
  NODE_LOG_ARCHIVE_TEMP: 'casa-lightning-node-logs-temp.tar.bz2',
  NODE_LOG_ARCHIVE: 'casa-lightning-node-logs.tar.bz2',
  REQUEST_CORRELATION_NAMESPACE_KEY: 'manager-request',
  REQUEST_CORRELATION_ID_KEY: 'reqId',
  SERIAL: process.env.SERIAL || UUID.fetchSerial() || 'UNKNOWN',
  SETTINGS_FILE: process.env.SETTINGS_FILE || '/settings/settings.json',
  SERVICES: {
    DEVICE_HOST: 'device-host',
    BITCOIND: 'bitcoind',
    LNAPI: 'lnapi',
    LND: 'lnd',
    LOGSPOUT: 'logspout',
    MANAGER: 'manager',
    PAPERTRAIL: 'papertrail',
    SPACE_FLEET: 'space-fleet',
    SYSLOG: 'syslog',
    UPDATE_MANAGER: 'update-manager',
  },
  TAG: process.env.TAG || 'arm',
  TIME: {
    ONE_HOUR_IN_MILLIS: 1 * 60 * 60 * 1000
  },
  LOGGING_SERVICES: ['syslog', 'papertrail', 'logspout'],
  USER_PASSWORD_FILE: process.env.USER_PASSWORD_FILE || '/accounts/user.json',
  CANONICAL_YML_DIRECTORY: process.env.CANONICAL_YML_DIRECTORY || './resources',
  JWT_PRIVATE_KEY_FILE: process.env.JWT_PRIVATE_KEY_FILE || './resources/jwt.key',
  JWT_PUBLIC_KEY_FILE: process.env.JWT_PUBLIC_KEY_FILE || './resources/jwt.pem',
  NODE_LOG_ARCHIVE_GPG_RECIPIENT: 'thomas@team.casa' // TODO: replace
};
