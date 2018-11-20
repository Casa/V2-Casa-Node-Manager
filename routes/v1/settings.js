/**
 * Handles all routes regarding settings for containers.
 */

const express = require('express');
const router = express.Router();
const LNNodeError = require('models/errors.js').NodeError;

const applicationLogic = require('logic/application.js');
const auth = require('middlewares/auth.js');
const diskLogic = require('logic/disk.js');
const schemaValidator = require('utils/settingsSchema.js');
const safeHandler = require('utils/safeHandler');

router.post('/save', auth.jwt, safeHandler((req, res, next) => {
  const settings = {
    bitcoind: {
      bitcoinNetwork: req.body.network,
      bitcoindListen: req.body.bitcoindListen, // eslint-disable-line object-shorthand
    },
    lnd: {
      lndNodeAlias: req.body.nickName,
      lndNetwork: req.body.network,
      autopilot: req.body.autopilot,
      maxChannels: req.body.maxChannels,
      maxChanSize: req.body.maxChanSize
    }
  };

  const validation = schemaValidator.validateSparseSettingsSchema(settings);
  if (!validation.valid) {
    return next(new LNNodeError(validation.errors));
  }

  return applicationLogic.saveSettings(settings)
    .then(() => res.json())
    .catch(() => next(new LNNodeError('Unable to save settings')));
}));

router.get('/read', auth.jwt, safeHandler((req, res, next) =>
  diskLogic.readSettingsFile()
    .then(config => {
      config.lnd.nickName = config.lnd.lndNodeAlias;
      delete config.lnd.lndNodeAlias;
      res.json(config);
    })
    .catch(() => next(new LNNodeError('Unable to read settings')))
));

module.exports = router;
