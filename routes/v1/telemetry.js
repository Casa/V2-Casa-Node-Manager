const express = require('express');
const router = express.Router();
const applicationLogic = require('logic/application.js');
const dockerLogic = require('logic/docker.js');
const auth = require('middlewares/auth.js');
const safeHandler = require('utils/safeHandler');

router.get('/version', auth.jwt, safeHandler((req, res) =>
  dockerLogic.getVersions()
    .then(versions => res.json(versions))
));

router.get('/serial', auth.jwt, safeHandler((req, res) =>
  applicationLogic.getSerial()
    .then(statuses => res.json(statuses))
));

router.get('/status', auth.jwt, safeHandler((req, res) =>
  dockerLogic.getStatuses()
    .then(statuses => res.json(statuses))
));

router.get('/volumes', auth.jwt, safeHandler((req, res) =>
  dockerLogic.getVolumeUsage()
    .then(volumeInfo => res.json(volumeInfo))
));

router.get('/logs', auth.jwt, safeHandler((req, res) =>
  dockerLogic.getLogs()
    .then(logs => res.json(logs))
));

router.get('/reset-status', auth.jwt, safeHandler((req, res) =>
  applicationLogic.getSystemResetStatus()
    .then(status => res.json(status))
));

module.exports = router;
