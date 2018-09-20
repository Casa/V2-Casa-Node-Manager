const express = require('express');
const router = express.Router();
const validator = require('utils/validator.js');
const applicationLogic = require('logic/application.js');
const auth = require('middlewares/auth.js');
const constants = require('utils/const.js');
const safeHandler = require('utils/safeHandler');

router.post('/toggle-remote-upload', auth.jwt, safeHandler((req, res, next) => {
  const enabled = req.body.enabled;

  try {
    validator.isBoolean('enabled', enabled);
  } catch (error) {
    return next(error);
  }

  return applicationLogic.cyclePaperTrail(enabled)
    .then(status => res.json(status));
}));

router.get('/download', auth.jwt, safeHandler((req, res) =>
  applicationLogic.downloadLogs()
    .then(logfile => res.download(logfile, constants.NODE_LOG_ARCHIVE))
));

module.exports = router;
