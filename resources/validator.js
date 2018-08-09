const KNOWN_SERVICES = ['lnd', 'bitcoind', 'application-api'];
const ValidationError = require('@resources/errors.js').ValidationError;

function isKnownService(service) {
  if (!KNOWN_SERVICES.includes(service)) {
    throw new ValidationError('Unknown service');
  }
}

module.exports = {
  isKnownService
};
