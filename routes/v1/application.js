const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
const applicationLogic = require('../../logic/application.js');
var q = require('q');

router.options('/');
router.post('/plex/install', function (req, res) {

  function handleSuccess() {
    res.json({
      chain: 'plex',
      status: 'running'
    });
  }

  function handleError(error) {
    var stringError = 'Unable to start bitcoin chain';
    logger.error(stringError, 'chain', error);
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
    var stringError = 'Unable to stop bitcoin chain';
    logger.error(stringError, 'chain', error);
    res.status(500).json(stringError);
  }

  applicationLogic.uninstall('plex')
    .then(handleSuccess)
    .catch(handleError);
});

module.exports = router;