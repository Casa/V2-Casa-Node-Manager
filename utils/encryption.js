var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
const KEY = 'UEFxQTe4l1re9t33pQwTRJOiNEZKS1Vi';

function encrypt(text) {
  var cipher = crypto.createCipher(algorithm, KEY);
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');

  return crypted;
}

function decrypt(text) {
  var decipher = crypto.createDecipher(algorithm, KEY);
  var dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');

  return dec;
}

module.exports = {
  encrypt,
  decrypt,
};
