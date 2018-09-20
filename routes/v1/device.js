const express = require('express');
const router = express.Router();

const applicationLogic = require('logic/application.js');
const validator = require('utils/validator.js');
const auth = require('middlewares/auth.js');
const safeHandler = require('utils/safeHandler');

router.post('/shutdown', auth.jwt, safeHandler((req, res) =>
  applicationLogic.shutdown()
    .then(status => res.json(status))
));

router.post('/reset', auth.jwt, safeHandler((req, res) =>
  applicationLogic.reset()
    .then(status => res.json(status))
));

router.post('/update', auth.jwt, safeHandler((req, res, next) => {
  const services = req.body.services;

  for (const service of services) {
    try {
      validator.isKnownService(service);
    } catch (error) {
      return next(error);
    }
  }

  return applicationLogic.update(services)
    .then(applicationNames => res.json(applicationNames));
}));

module.exports = router;
