const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
var q = require('q');

var Docker = require('dockerode');
var docker = new Docker();

router.options('/');
router.get('/', function (req, res) {

  function handleSuccess(containers) {
    var result = {
      containers: containers
    };

    res.json(result);
  }

  function getImages() {
    var deferred = q.defer();

    docker.listContainers(function (error, containers) {

      if(error)  {
        deferred.reject(error);
      } else {
        deferred.resolve(containers);
      }
    });

    return deferred.promise;
  }

  function handleError(error) {
    logger.error('Unable to generate address', 'address', error);
    res.status(500).json('Unable to generate address');
  }

  getImages()
    .then(handleSuccess)
    .catch(handleError);
});

module.exports = router;