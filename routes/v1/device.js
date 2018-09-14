const express = require('express');
const router = express.Router();

const applicationLogic = require('logic/application.js');
const validator = require('utils/validator.js');
const auth = require('middlewares/auth.js');

router.post('/shutdown', auth.jwt, function(req, res, next) {
  applicationLogic.shutdown()
    .then(status => res.json(status))
    .catch(next);
});

router.post('/reset', auth.jwt, function(req, res, next) {
  applicationLogic.reset()
    .then(status => res.json(status))
    .catch(next);
});

router.post('/update', auth.jwt, function(req, res, next) {
  const services = req.body.services;

  for (const service of services) {
    try {
      validator.isKnownService(service);
    } catch (error) {
      return next(error);
    }
  }

  applicationLogic.update(services)
    .then(applicationNames => res.json(applicationNames))
    .catch(next);
});

module.exports = router;
