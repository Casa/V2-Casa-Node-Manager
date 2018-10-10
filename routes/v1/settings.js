/**
 * Handles all routes regarding settings for containers.
 */

const express = require('express');
const router = express.Router();
const LNNodeError = require('models/errors.js').NodeError;

const auth = require('middlewares/auth.js');
const diskLogic = require('logic/disk.js');
const schemaValidator = require('utils/settingsSchema.js');
const safeHandler = require('utils/safeHandler');

router.post('/save', auth.jwt, safeHandler((req, res, next) => {
  // TODO: maybe defaults once, talk to Nick
  const network = req.body.network;
  const bitcoindListen = req.body.bitcoindListen;
  const alias = req.body.nickName;
  const autopilot = req.body.autopilot;
  const maxChannels = req.body.maxChannels;
  const maxChanSize = req.body.maxChanSize;
  const openChanFeeRate = req.body.openChanFeeRate;

  // TODO: types for sats/etc, conversion here?
  var config = {
    bitcoind: {
      bitcoinNetwork: network,
      bitcoindListen: bitcoindListen, // eslint-disable-line object-shorthand
    },
    lnd: {
      chain: 'bitcoin',
      backend: 'bitcoind',
      lndNodeAlias: alias,
      lndNetwork: network,
      autopilot: autopilot, // eslint-disable-line object-shorthand
      maxChannels: maxChannels, // eslint-disable-line object-shorthand
      maxChanSize: maxChanSize, // eslint-disable-line object-shorthand
      openChanFeeRate: openChanFeeRate, // eslint-disable-line object-shorthand
    }
  };

  const validation = schemaValidator.validateSettingsSchema(config);
  if (!validation.valid) {
    return next(new LNNodeError(validation.errors));
  }

  return diskLogic.writeSettingsFile(config)
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
