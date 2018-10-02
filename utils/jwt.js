const jwt = require('jsonwebtoken');

const constants = require('utils/const.js');

// Environmental variables are Strings, the expiry will be interpreted as milliseconds if not converted to int.
// eslint-disable-next-line no-magic-numbers
const expiresIn = process.env.JWT_EXPIRATION ? parseInt(process.env.JWT_EXPIRATION, 10) : 3600;

function generateJWT(account) {
  // eslint-disable-next-line object-shorthand
  const token = jwt.sign({id: account}, constants.SHARED_JWT_SECRET, {expiresIn: expiresIn});

  if (token) {
    return Promise.resolve(token);
  } else {
    return Promise.reject(new Error('Error generating JWT token, is null'));
  }
}

module.exports = {
  generateJWT,
};
