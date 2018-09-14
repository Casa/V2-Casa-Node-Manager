const KNOWN_SERVICES = ['lnd', 'bitcoind', 'lnapi', 'space-fleet', 'syslog', 'papertrail', 'logspout'];
const ValidationError = require('models/errors.js').ValidationError;

function isKnownService(service) {
  if (!KNOWN_SERVICES.includes(service)) {
    throw new ValidationError('Unknown service');
  }
}

function isBoolean(key, value) {
  if (value !== true && value !== false) {
    throw new ValidationError(key + ': Must be true or false.');
  }
}

module.exports = {
  isKnownService,
  isBoolean
};
