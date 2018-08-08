const KNOWN_SERVICES = ['lnd', 'bitcoind', 'application-api'];
const ValidationError = require('./errors.js').ValidationError;

function isKnownService(service) {
  if (!KNOWN_SERVICES.includes(service)) {
    throw new ValidationError('Unknown service');
  }
}

module.exports = {
  isKnownService
};
