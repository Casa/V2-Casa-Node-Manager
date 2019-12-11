/* eslint-disable id-length */
/* eslint-disable no-magic-numbers */
const UUID = require('utils/UUID');

const APPLICATIONS = {
  DEVICE_HOST: 'device-host',
  ERROR: 'error',
  LIGHTNING_NODE: 'lightning-node',
  LOGSPOUT: 'logspout',
  MANAGER: 'manager',
  TOR: 'tor',
};

const SERVICES = {
  DEVICE_HOST: 'device-host',
  BITCOIND: 'bitcoind',
  ERROR: 'error',
  LNAPI: 'lnapi',
  LND: 'lnd',
  LOGSPOUT: 'logspout',
  MANAGER: 'manager',
  PAPERTRAIL: 'papertrail',
  SPACE_FLEET: 'space-fleet',
  SYSLOG: 'syslog',
  TOR: 'tor'
};

const APPLICATION_TO_SERVICES_MAP = {};
APPLICATION_TO_SERVICES_MAP[APPLICATIONS.DEVICE_HOST] = [SERVICES.DEVICE_HOST];
APPLICATION_TO_SERVICES_MAP[APPLICATIONS.ERROR] = [SERVICES.ERROR];
APPLICATION_TO_SERVICES_MAP[APPLICATIONS.TOR] = [SERVICES.TOR];
APPLICATION_TO_SERVICES_MAP[APPLICATIONS.MANAGER] = [SERVICES.MANAGER];
APPLICATION_TO_SERVICES_MAP[APPLICATIONS.LIGHTNING_NODE] = [SERVICES.SPACE_FLEET, SERVICES.BITCOIND, SERVICES.LND,
  SERVICES.LNAPI];
APPLICATION_TO_SERVICES_MAP[APPLICATIONS.LOGSPOUT] = [SERVICES.LOGSPOUT, SERVICES.SYSLOG];

module.exports = {
  APP_VERSION_FILES: {
    DEVICE_HOST: APPLICATIONS.DEVICE_HOST + '.json',
    ERROR: APPLICATIONS.ERROR + '.json',
    LIGHTNING_NODE: APPLICATIONS.LIGHTNING_NODE + '.json',
    LOGSPOUT: APPLICATIONS.LOGSPOUT + '.json',
    MANAGER: APPLICATIONS.MANAGER + '.json',
    TOR: APPLICATIONS.TOR + '.json',
  },
  APPLICATIONS,
  APPLICATION_TO_SERVICES_MAP,
  CASA_NODE_HIDDEN_SERVICE_FILE: '/var/lib/tor/casa-node/hostname',
  CASABUILDER_USERNAME: 'casabuilder',
  COMPOSE_FILES: {
    DEVICE_HOST: APPLICATIONS.DEVICE_HOST + '.yml',
    LIGHTNING_NODE: APPLICATIONS.LIGHTNING_NODE + '.yml',
    LOGSPOUT: APPLICATIONS.LOGSPOUT + '.yml',
    MANAGER: APPLICATIONS.MANAGER + '.yml',
    TOR: APPLICATIONS.TOR + '.yml',
  },
  DEFAULT_SSH_PASSWORD: 'casa',
  WORKING_DIRECTORY: '/usr/local/casa/applications',
  UTILS_DIRECTORY: '/usr/src/app/utils',
  LOGGING_DOCKER_COMPOSE_FILE: 'logspout.yml',
  METADATA_FILE: 'metadata.json',
  NODE_LOG_ARCHIVE_TEMP: 'casa-lightning-node-logs-temp.tar.bz2',
  NODE_LOG_ARCHIVE: 'casa-lightning-node-logs.tar.bz2',
  REQUEST_CORRELATION_NAMESPACE_KEY: 'manager-request',
  REQUEST_CORRELATION_ID_KEY: 'reqId',
  SERIAL: process.env.SERIAL || UUID.fetchSerial() || 'UNKNOWN',
  SETTINGS_FILE: process.env.SETTINGS_FILE || '/settings/settings.json',
  SERVICES,
  STATUS_CODES: {
    ACCEPTED: 202,
    BAD_GATEWAY: 502,
    CONFLICT: 409,
    FORBIDDEN: 403,
    OK: 200,
    UNAUTHORIZED: 401,
  },
  TAG: process.env.TAG || 'arm',
  TIME: {
    FIVE_MINUTES_IN_MILLIS: 5 * 60 * 1000,
    ONE_DAY_IN_MILLIS: 24 * 60 * 60 * 10001000,
    ONE_SECOND_IN_MILLIS: 1000,
    ONE_HOUR_IN_MILLIS: 60 * 60 * 1000,
    NINETY_MINUTES_IN_MILLIS: 90 * 60 * 1000,
    HOURS_IN_TWO_DAYS: 47,
  },
  TMP_BUILD_ARTIFACTS_DIRECTORY: '/tmp/build-artifacts',
  TMP_DIRECTORY: '/tmp',
  LOGGING_SERVICES: ['syslog', 'papertrail', 'logspout'],
  USER_PASSWORD_FILE: process.env.USER_PASSWORD_FILE || '/accounts/user.json',
  CANONICAL_YML_DIRECTORY: process.env.CANONICAL_YML_DIRECTORY || './resources',
  JWT_PRIVATE_KEY_FILE: process.env.JWT_PRIVATE_KEY_FILE || './resources/jwt.key',
  JWT_PUBLIC_KEY_FILE: process.env.JWT_PUBLIC_KEY_FILE || './resources/jwt.pem',
  MANAGER_APPLICATION_DIRECTORY: '/usr/src/app',
  NODE_LOG_ARCHIVE_GPG_RECIPIENT: 'node-logs@team.casa',
  DOCKER_ORGANIZATION: 'casanode',
  LAUNCH_SCRIPT: 'launch.sh',
  LAUNCH_DIRECTORY: '/usr/local/casa/service-scripts',
  SHUTDOWN_SIGNAL_FILE: '/usr/local/casa/signals/shutdown_signal',
  RELAUNCH_SIGNAL_FILE: '/usr/local/casa/signals/relaunch_signal',
  MIGRATION_SIGNAL_FILE: '/usr/local/casa/signals/migration_signal',
  SSH_SIGNAL_FILE: '/usr/local/casa/signals/ssh_signal',
  ACCOUNT_SIGNAL_FILE: '/usr/local/casa/signals/account_signal',
  MIGRATION_STATUS_FILE: '/usr/local/casa/service-scripts/migration-status.json',
  SHADOW_HASHING_SCRIPT: 'account.py'
};
