const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
const applicationLogic = require('../../logic/application.js');
var q = require('q');

router.options('/');
router.post('/hello-world/install', function (req, res) {

  function handleSuccess() {
    res.json({
      chain: 'hello-world',
      status: 'running'
    });
  }

  function handleError(error) {
    var stringError = 'Unable to start hello-world';
    logger.error(stringError, 'application', error);
    res.status(500).json(stringError);
  }

  applicationLogic.install('hello-world')
    .then(handleSuccess)
    .catch(handleError);
});

router.options('/');
router.post('/plex/install', function (req, res) {

  function handleSuccess() {
    res.json({
      chain: 'plex',
      status: 'running'
    });
  }

  function handleError(error) {
    var stringError = 'Unable to start plex';
    logger.error(stringError, 'application', error);
    res.status(500).json(stringError);
  }

  applicationLogic.install('plex')
    .then(handleSuccess)
    .catch(handleError);
});

router.options('/');
router.post('/plex/uninstall', function (req, res) {
  function handleSuccess() {
    res.json({
      chain: 'plex',
      status: 'uninstalled'
    });
  }

  function handleError(error) {
    var stringError = 'Unable to uninstall plex';
    logger.error(stringError, 'application', error);
    res.status(500).json(stringError);
  }

  applicationLogic.uninstall('plex')
    .then(handleSuccess)
    .catch(handleError);
});

module.exports = router;