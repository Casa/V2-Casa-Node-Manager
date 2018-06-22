const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
const applicationLogic = require('../../logic/application.js');
var q = require('q');

router.options('/');
router.post('/bitcoin/start', function (req, res) {

  function handleSuccess() {
    res.json({
      chain: 'bitcoin',
      status: 'running'
    });
  }

  function handleError(error) {
    var stringError = 'Unable to start bitcoin chain';
    logger.error(stringError, 'chain', error);
    res.status(500).json(stringError);
  }

  applicationLogic.start('bitcoin')
    .then(handleSuccess)
    .catch(handleError);
});

router.options('/');
router.post('/bitcoin/stop', function (req, res) {
  function handleSuccess() {
    res.json({
      chain: 'bitcoin',
      status: 'stopped'
    });
  }

  function handleError(error) {
    var stringError = 'Unable to stop bitcoin chain';
    logger.error(stringError, 'chain', error);
    res.status(500).json(stringError);
  }

  applicationLogic.stop('bitcoin')
    .then(handleSuccess)
    .catch(handleError);
});

router.options('/');
router.post('/bitcoin/install', function (req, res) {

});

router.options('/');
router.delete('/bitcoin/uninstall', function (req, res) {

});

module.exports = router;