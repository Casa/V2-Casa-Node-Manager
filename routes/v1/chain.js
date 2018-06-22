const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
const applicationLogic = require('../../logic/application.js');
var q = require('q');

router.options('/');
router.post('/bitcoin/start', function (req, res) {

  function handleSuccess() {
    res.json({});
  }

  function handleError(error) {
    logger.error('Unable to generate address', 'address', error);
    res.status(500).json('Unable to generate address');
  }

  applicationLogic.start('bitcoin')
    .then(handleSuccess)
    .catch(handleError);
});

router.options('/');
router.post('/bitcoin/stop', function (req, res) {

});

router.options('/');
router.post('/bitcoin/install', function (req, res) {

});

router.options('/');
router.delete('/bitcoin/uninstall', function (req, res) {

});

module.exports = router;