const express = require('express');
const router = express.Router();

const applicationLogic = require('../../logic/application.js');
const validator = require('../../resources/validator.js');
const logger = require('../../resources/logger.js');

router.post('/start', function (req, res) {

    function handleSuccess(applicationNames) {
        res.json(applicationNames);
    }

    function handleError(error) {
        var errorMessage = 'Unable to start services';
        logger.error(errorMessage, 'start', error);
        res.status(500).json(errorMessage);
    }

    applicationLogic.start()
        .then(handleSuccess)
        .catch(handleError);
});

router.post('/shutdown', function (req, res) {

    function handleSuccess(applicationNames) {
        res.json(applicationNames);
    }

    function handleError(error) {
        var errorMessage = 'Unable to shutdown services';
        logger.error(errorMessage, 'shutdown', error);
        res.status(500).json(errorMessage);
    }

    applicationLogic.shutdown()
        .then(handleSuccess)
        .catch(handleError);
});

router.post('/reset', function (req, res) {

    function handleSuccess(applicationNames) {
        res.json(applicationNames);
    }

    function handleError(error) {
        var errorMessage = 'Unable to reset device';
        logger.error(errorMessage, 'reset', error);
        res.status(500).json(errorMessage);
    }

    applicationLogic.reset()
        .then(handleSuccess)
        .catch(handleError);
});

router.post('/restart', function (req, res) {
    const service = req.body.service;

    try {
        validator.isKnownService(service)
    } catch (e) {
        res.status(400).json(e);
    }

    function handleSuccess(applicationNames) {
        res.json(applicationNames);
    }

    function handleError(error) {
        var errorMessage = 'Unable to restart service';
        logger.error(errorMessage, 'restart', error);
        res.status(500).json(errorMessage);
    }

    applicationLogic.restart({service: service})
        .then(handleSuccess)
        .catch(handleError);
});

router.post('/update', function (req, res) {
    const service = req.body.service;

    try {
        validator.isKnownService(service);
        validator.isValidTag(tag);
    } catch (e) {
        res.status(400).json(e);
    }

    function handleSuccess(applicationNames) {
        res.json(applicationNames);
    }

    function handleError(error) {
        var errorMessage = 'Unable to update service';
        logger.error(errorMessage, 'update', error);
        res.status(500).json(errorMessage);
    }

    applicationLogic.update({service: service})
        .then(handleSuccess)
        .catch(handleError);
});

module.exports = router;
