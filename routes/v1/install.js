const express = require('express');
const router = express.Router();

const applicationLogic = require('../../logic/application.js');

const logger = require('../../resources/logger.js');
const validator = require('../../resources/validator.js');

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

router.options('/chain');
router.post('/chain/:name/:chain', function (req, res) {

  const name = req.params.name;
  const chain = req.params.chain;

  try {
    validator.isAlphanumeric(name);
    validator.isValidChain(chain);
  } catch (error) {
    res.status(400).json(error);
    return;
  }

  function handleSuccess() {
    res.json({
      application: name,
      chain: chain,
      status: 'installed'
    });
  }

  function handleError(error) {
    var stringError = 'Unable to find any available applications';
    logger.error(stringError, 'install', error);
    res.status(500).json(stringError);
  }

  applicationLogic.install(name, chain)
    .then(handleSuccess)
    .catch(handleError);
});

router.options('/application');
router.post('/application/:name/', function (req, res) {

  const name = req.params.name;

  try {
    validator.isAlphanumeric(name);
  } catch (error) {
    res.status(400).json(error);
    return;
  }

  function handleSuccess() {
    res.json({
      application: name,
      status: 'installed'
    });
  }

  function handleError(error) {
    var stringError = 'Unable to find any available applications';
    logger.error(stringError, 'install', error);
    res.status(500).json(stringError);
  }

  applicationLogic.install(name)
    .then(handleSuccess)
    .catch(handleError);
});

module.exports = router;