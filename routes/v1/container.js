const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
const docker = require('../../services/docker.js');
var q = require('q');

router.options('/');
router.get('/', function (req, res) {

  const all = JSON.parse(req.query.all || 'false');

  function handleSuccess(containers) {
    var result = {
      containers: containers
    };

    res.json(result);
  }

  function handleError(error) {
    logger.error('Unable to generate address', 'address', error);
    res.status(500).json('Unable to generate address');
  }

  //TODO this should call logic layer, not services directly
  var promise;
  if(all == true) {
    promise = docker.getAllContainers();
  } else {
    promise = docker.getRunningContainers();
  }

  promise
    .then(handleSuccess)
    .catch(handleError);
});

module.exports = router;