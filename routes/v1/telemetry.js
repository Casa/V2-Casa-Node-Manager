const express = require('express');
const router = express.Router();
const dockerLogic = require('../../logic/docker.js');
const logger = require('../../resources/logger.js');

router.get('/version', function (req, res) {
    function handleSuccess(versions) {
        res.json(versions);
    }

    function handleError(error) {
        var errorMessage = 'Unable to determine versions';
        logger.error(errorMessage, 'versions', error);
        res.status(500).json(errorMessage);
    }

    dockerLogic.getVersions()
        .then(handleSuccess)
        .catch(handleError);
});

router.get('/status', function (req, res) {
    function handleSuccess(statuses) {
        res.json(statuses);
    }

    function handleError(error) {
        var errorMessage = 'Unable to determine statuses';
        logger.error(errorMessage, 'status', error);
        res.status(500).json(errorMessage);
    }

    dockerLogic.getStatuses()
        .then(handleSuccess)
        .catch(handleError)

});

router.get('/volumes', function (req, res) {
    function handleSuccess(volumeInfo) {
        res.json(volumeInfo);
    }

    function handleError(error) {
        var errorMessage = 'Unable to determine volume info';
        logger.error(errorMessage, 'volumes', error);
        res.status(500).json(errorMessage);
    }

    dockerLogic.getVolumeUsage()
        .then(handleSuccess)
        .catch(handleError);

});

router.get('/healthcheck', function (req, res) {
    function handleSuccess(status) {
        res.json(status);
    }

    function handleError(error) {
        var errorMessage = 'Unable to determine health';
        logger.error(errorMessage, 'healthcheck', error);
        res.status(500).json(errorMessage);
    }

    dockerLogic.getSystemHealth()
        .then(handleSuccess)
        .catch(handleError);

});

module.exports = router;
