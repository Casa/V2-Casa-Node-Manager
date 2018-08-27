const KNOWN_SERVICES = ['lnd', 'bitcoind', 'lnapi', 'space-fleet'];
const ValidationError = require('@models/errors.js').ValidationError;

function isKnownService(service) {
  if (!KNOWN_SERVICES.includes(service)) {
    throw new ValidationError('Unknown service');
  }
}

module.exports = {
  isKnownService
};
