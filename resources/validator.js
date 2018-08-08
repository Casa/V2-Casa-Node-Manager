const KNOWN_SERVICES = ['lnd', 'bitcoind', 'application-api'];

function isKnownService(service) {
  if (!KNOWN_SERVICES.includes(service)) {
    throw {
      code: 'UNKNOWN_SERVICE',
      text: 'Unknown service.'
    };
  }
}

module.exports = {
  isKnownService
};
