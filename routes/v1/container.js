const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
const dockerLogic = require('../../logic/docker.js');
var q = require('q');

function getContainers(res, all) {
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
    promise = dockerLogic.getAllContainers();
  } else {
    promise = dockerLogic.getRunningContainers();
  }

  promise
    .then(handleSuccess)
    .catch(handleError);
}

router.options('/running');
router.get('/running', function (req, res) {
  getContainers(res, false);
});

router.options('/all');
router.get('/all', function (req, res) {
  getContainers(res, true);
});

router.options('/');
router.get('/name/:name', function (req, res) {

  const name = req.params.name;

  function handleSuccess(container) {
    res.json(container);
  }

  function handleError(error) {
    logger.error('Unable to find container', 'address', error);
    res.status(500).json('Unable to find container');
  }

  dockerLogic.getContainer(name)
    .then(handleSuccess)
    .catch(handleError);

});

module.exports = router;