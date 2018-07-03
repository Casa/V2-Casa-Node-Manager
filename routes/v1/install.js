const express = require('express');
const router = express.Router();
const applicationLogic = require('../../logic/application.js');
const logger = require('../../resources/logger.js');
const validator = require('../../resources/validator.js');
const docker = require('../../services/docker.js');
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

  function ensureOneApplicationAvailable(applications) {
    if(applications.length === 0) {
      throw {
        code: 'NO_APPLICATION_FOUND',
        text: 'There are no applications that meet the given specifications.'
      }
    } else if(applications.length > 1) {
      throw {
        code: 'MULTIPLE_APPLICATIONS_FOUND',
        text: 'Multiple applications meet the given specifications. Please be more specific.'
      }
    }

    return applications[0];
  }

  function handleSuccess(applicationNames) {
    res.json(applicationNames);
  }

  function handleError(error) {
    var stringError = 'Unable to find any available applications';
    logger.error(stringError, 'install', error);
    res.status(500).json(stringError);
  }

  applicationLogic.getAvailable(name, chain)
    .then(ensureOneApplicationAvailable)
    .then(applicationLogic.install)
    .then(handleSuccess)
    .catch(handleError);
});

module.exports = router;