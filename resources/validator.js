const KNOWN_SERVICES = ['lnd', 'bitcoind', 'lnapi'];
const ValidationError = require('./errors.js').ValidationError;

function isKnownService(service) {
  if (!KNOWN_SERVICES.includes(service)) {
    throw new ValidationError('Unknown service');
  }
}

module.exports = {
  isKnownService
};
