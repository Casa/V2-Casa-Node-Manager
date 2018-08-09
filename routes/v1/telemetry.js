const express = require('express');
const router = express.Router();
const dockerLogic = require('@logic/docker.js');

router.get('/version', function(req, res, next) {
  dockerLogic.getVersions()
    .then(versions => res.json(versions))
    .catch(next);
});

router.get('/status', function(req, res, next) {
  dockerLogic.getStatuses()
    .then(statuses => res.json(statuses))
    .catch(next);

});

router.get('/volumes', function(req, res, next) {
  dockerLogic.getVolumeUsage()
    .then(volumeInfo => res.json(volumeInfo))
    .catch(next);

});

router.get('/healthcheck', function(req, res, next) {
  dockerLogic.getSystemHealth()
    .then(status => res.json(status))
    .catch(next);

});

module.exports = router;
