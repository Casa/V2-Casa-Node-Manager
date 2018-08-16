const express = require('express');
const router = express.Router();

const applicationLogic = require('@logic/application.js');
const validator = require('@utils/validator.js');
const auth = require('@middlewares/auth.js');

router.post('/start', auth.jwt, function(req, res, next) {
  applicationLogic.start()
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

router.post('/shutdown', auth.jwt, function(req, res, next) {
  applicationLogic.shutdown()
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

router.post('/reset', auth.jwt, function(req, res, next) {
  applicationLogic.reset()
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

router.post('/restart', auth.jwt, function(req, res, next) {
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

router.post('/update', auth.jwt, function(req, res, next) {
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
