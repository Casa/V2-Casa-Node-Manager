const express = require('express');
const router = express.Router();
const applicationLogic = require('@logic/application.js');
const dockerLogic = require('@logic/docker.js');
const auth = require('@middlewares/auth.js');

router.get('/version', auth.jwt, function(req, res, next) {
  dockerLogic.getVersions()
    .then(versions => res.json(versions))
    .catch(next);
});

router.get('/serial', auth.jwt, function(req, res, next) {
  applicationLogic.getSerial()
    .then(statuses => res.json(statuses))
    .catch(next);

});

router.get('/status', auth.jwt, function(req, res, next) {
  dockerLogic.getStatuses()
    .then(statuses => res.json(statuses))
    .catch(next);

});

router.get('/volumes', auth.jwt, function(req, res, next) {
  dockerLogic.getVolumeUsage()
    .then(volumeInfo => res.json(volumeInfo))
    .catch(next);

});

router.get('/logs', auth.jwt, function(req, res, next) {
  dockerLogic.getLogs()
    .then(logs => res.json(logs))
    .catch(next);
});

module.exports = router;
