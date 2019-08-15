const express = require('express');
const router = express.Router();

const applicationLogic = require('logic/application.js');
const authLogic = require('logic/auth.js');
const auth = require('middlewares/auth.js');
const constants = require('utils/const.js');

const safeHandler = require('utils/safeHandler');
const validator = require('utils/validator.js');

// API endpoint to change your lnd password. Wallet must exist and be unlocked.
router.post('/changePassword', auth.jwt, safeHandler(async(req, res, next) => {

  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;

  // Pull out the existing jwt token for use later
  const jwt = req.headers.authorization.split(' ').pop();

  try {
    validator.isString(currentPassword);
    validator.isMinPasswordLength(currentPassword);
    validator.isString(newPassword);
    validator.isMinPasswordLength(newPassword);
  } catch (error) {
    return next(error);
  }

  // start change password process in the background and immediately return
  authLogic.changePassword(currentPassword, newPassword, jwt);

  return res.status(constants.STATUS_CODES.OK).json();
}));

// Returns the current status of the change password process.
router.get('/changePassword/status', auth.jwt, safeHandler(async(req, res) => {
  const status = await authLogic.getChangePasswordStatus();

  return res.status(constants.STATUS_CODES.OK).json(status);
}));

// Registered does not need auth. This is because the user may not be registered at the time and thus won't always have
// an auth token.
router.get('/registered', safeHandler((req, res) =>
  authLogic.isRegistered()
    .then(registered => res.json(registered))
));

router.post('/register', auth.register, safeHandler((req, res) =>
  authLogic.register(req.user)
    .then(jwt => res.json(jwt))
));

router.post('/login', auth.convertReqBodyToBasicAuth, auth.basic, safeHandler((req, res) =>
  applicationLogic.login(req.user)
    .then(jwt => res.json(jwt))
));

router.post('/refresh', auth.jwt, safeHandler((req, res) =>
  applicationLogic.refresh(req.user)
    .then(jwt => res.json(jwt))
));

module.exports = router;
