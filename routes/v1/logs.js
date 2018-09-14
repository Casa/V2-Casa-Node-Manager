const express = require('express');
const router = express.Router();
const validator = require('utils/validator.js');
const applicationLogic = require('logic/application.js');
const auth = require('middlewares/auth.js');
const constants = require('utils/const.js');

router.post('/toggle-remote-upload', auth.jwt, function(req, res, next) {
  const enabled = req.body.enabled;

  try {
    validator.isBoolean('enabled', enabled);
  } catch (error) {
    return next(error);
  }

  applicationLogic.cyclePaperTrail(enabled)
    .then(status => res.json(status))
    .catch(next);

});

router.get('/download', auth.jwt, function(req, res, next) {
  applicationLogic.downloadLogs()
    .then(logfile => res.download(logfile, constants.NODE_LOG_ARCHIVE))
    .catch(next);
});

module.exports = router;
