const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
const applicationLogic = require('../../logic/application.js');
var q = require('q');

router.options('/available');
router.get('/available', function (req, res) {

  const application = req.query.application || '';

  function handleSuccess(applicationNames) {
    res.json(applicationNames);
  }

  function handleError(error) {
    var stringError = 'Unable to find any available applications';
    logger.error(stringError, 'install', error);
    res.status(500).json(stringError);
  }

  applicationLogic.getAvailable(application)
    .then(handleSuccess)
    .catch(handleError);
});

module.exports = router;