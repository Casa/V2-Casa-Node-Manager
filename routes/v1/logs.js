const express = require('express');
const router = express.Router();
const applicationLogic = require('logic/application.js');
const auth = require('middlewares/auth.js');
const constants = require('utils/const.js');
const safeHandler = require('utils/safeHandler');

router.get('/download', auth.jwt, safeHandler((req, res) =>
  applicationLogic.downloadLogs()
    .then(logfile => res.download(logfile, constants.NODE_LOG_ARCHIVE, function callback() {
      applicationLogic.deleteLogArchives();
    }))
));

module.exports = router;
