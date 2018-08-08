const express = require('express');
const router = express.Router();

const applicationLogic = require('../../logic/application.js');
const validator = require('../../resources/validator.js');

router.post('/start', function(req, res, next) {
  applicationLogic.start()
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

router.post('/shutdown', function(req, res, next) {
  applicationLogic.shutdown()
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

router.post('/reset', function(req, res, next) {
  applicationLogic.reset()
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

router.post('/restart', function(req, res, next) {
  const service = req.body.service;

  try {
    validator.isKnownService(service);
  } catch (error) {
    return next(error);
  }

  applicationLogic.restart({service: service}) // eslint-disable-line object-shorthand
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

router.post('/update', function(req, res, next) {
  const service = req.body.service;

  try {
    validator.isKnownService(service);
  } catch (error) {
    return next(error);
  }

  applicationLogic.update({service: service}) // eslint-disable-line object-shorthand
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

module.exports = router;
