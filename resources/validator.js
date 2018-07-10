var validator = require('validator');

function isAlpha(object) {
  if(validator.isAlpha(object)) {
    return;
  } else {
    throw {
      code: 'IS_ALPHA',
      text: 'Must contain only characters.'
    }
  }
}

function isAlphanumeric(string) {

  isDefined(string);

  if(validator.isAlphanumeric(string)) {
    return;
  } else {
    throw {
      code: 'ALPHANUMERIC',
      text: 'Must include only alpha numeric characters.'
    }
  }
}

function isDefined(object) {
  if(object === undefined) {
    throw {
      code: 'NOT_DEFINED',
      text: 'Must define variable.'
    }
  }
}

/*
Validate we support the given chain.
 */

function isValidNetwork(network) {
  if(network === 'mainnet' ||
    network === 'testnet' ||
    network === 'simnet') {
    return;
  } else {
    throw {
      code: 'IS_VALID_CHAIN',
      text: 'Chain must be mainnet or testnet'
    }
  }
}

module.exports = {
  isAlpha: isAlpha,
  isAlphanumeric: isAlphanumeric,
  isValidNetwork: isValidNetwork
};