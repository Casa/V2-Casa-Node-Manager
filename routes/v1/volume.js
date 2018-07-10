const express = require('express');
const router = express.Router();
const logger = require('../../resources/logger.js');
const dockerLogic = require('../../logic/docker.js');

router.options('/all');
router.get('/all', function (req, res) {
  function handleSuccess(volumes) {
    var result = {
      volumes: volumes
    };

    res.json(result);
  }

  function handleError(error) {
    logger.error('Unable to generate address', 'address', error);
    res.status(500).json('Unable to generate address');
  }


  dockerLogic.getVolumes()
    .then(handleSuccess)
    .catch(handleError);
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

  dockerLogic.getVolume(name)
    .then(handleSuccess)
    .catch(handleError);

});

module.exports = router;