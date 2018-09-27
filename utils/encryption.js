var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
const CASABUILDER_KEY = 'UEFxQTe4l1re9t33pQwTRJOiNEZKS1Vi';
const CASAWORKER_KEY = 'c8FWk8wzeqkcxV0NLnwQ3HfdSaQVQnQx';

function decrypt(text, key) {
  var decipher = crypto.createDecipher(algorithm, key);
  var dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');

  return dec;
}

function decryptCasabuilder(text) {
  return decrypt(text, CASABUILDER_KEY);
}

function decryptCasaworker(text) {
  return decrypt(text, CASAWORKER_KEY);
}

module.exports = {
  decryptCasabuilder,
  decryptCasaworker,
};
