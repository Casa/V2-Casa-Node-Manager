const bcrypt = require('bcrypt');
const diskLogic = require('logic/disk.js');
const dockerComposeLogic = require('logic/docker-compose.js');
const lnapiService = require('services/lnapi.js');
const NodeError = require('models/errors.js').NodeError;
const JWTHelper = require('utils/jwt.js');
const constants = require('utils/const.js');
const UUID = require('utils/UUID.js');

const saltRounds = 10;

const SYSTEM_USER = UUID.fetchBootUUID() || 'admin';

async function sleepSeconds(seconds) {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * constants.TIME.ONE_SECOND_IN_MILLIS);
  });
}

async function changePassword(currentPassword, newPassword, jwt) {

  // restart lnd
  await dockerComposeLogic.dockerComposeStop({service: constants.SERVICES.LND});
  await dockerComposeLogic.dockerComposeUpSingleService({service: constants.SERVICES.LND});

  let attemptChangePassword = true;
  let attempt = 0;
  const MAX_ATTEMPTS = 10;

  do {
    try {
      attempt++;

      // call lnapi to change password
      await lnapiService.changePassword(currentPassword, newPassword, jwt);

      // make new password file
      const credentials = hashCredentials(SYSTEM_USER, newPassword);

      // replace user file
      await diskLogic.deleteUserFile();
      await diskLogic.writeUserFile(credentials);

      attemptChangePassword = false;
    } catch (error) {

      // When lnd is restarting lnapi will respond with a 502. We will try again until lnd is operational.
      if (error.response.status !== constants.STATUS_CODES.BAD_GATEWAY) {
        throw error;
      }

      // wait for lnd to boot up
      await sleepSeconds(1);
    }
  } while (attemptChangePassword && attempt < MAX_ATTEMPTS);

}

// Returns an object with the hashed credentials inside.
function hashCredentials(username, password) {
  const hash = bcrypt.hashSync(password, saltRounds);

  return {password: hash, username};
}

async function isRegistered() {
  try {
    await diskLogic.readUserFile();

    return {registered: true};
  } catch (error) {
    return {registered: false};
  }
}

async function login(user) {
  try {
    const jwt = await JWTHelper.generateJWT(user.username);

    return {jwt: jwt}; // eslint-disable-line object-shorthand
  } catch (error) {
    throw new NodeError('Unable to generate JWT');
  }
}

async function register(user) {
  if ((await isRegistered()).registered) {
    throw new NodeError('User already exists', 400); // eslint-disable-line no-magic-numbers
  }

  try {
    await diskLogic.writeUserFile({password: user.password});
  } catch (error) {

    throw new NodeError('Unable to register');
  }

  try {
    const jwt = await JWTHelper.generateJWT(user.username);

    return {jwt: jwt}; // eslint-disable-line object-shorthand
  } catch (error) {
    throw new NodeError('Unable to generate JWT');
  }
}

async function refresh(user) {
  try {
    const jwt = await JWTHelper.generateJWT(user.username);

    return {jwt: jwt}; // eslint-disable-line object-shorthand
  } catch (error) {
    throw new NodeError('Unable to generate JWT');
  }
}

module.exports = {
  changePassword,
  hashCredentials,
  isRegistered,
  login,
  register,
  refresh,
};
