const express = require('express');
const router = express.Router();

const dockerLogic = require('../../logic/docker.js');
const logger = require('../../resources/logger.js');
const validator = require('../../resources/validator.js');

const applicationLogic = require('../../logic/application.js');

router.get('/:chain', function (req, res) {

    const chain = req.params.chain;

    try {
        validator.isAlphanumeric(chain);
    } catch (error) {
        res.status(400).json(error);
        return;
    }

    const volumeName = 'currentappyaml_' + chain + '-data';

    function injectInfo() {
        return {
            container: 'data-transfer',
            chain: chain
        };
    }

    function handleSuccess() {
        res.json({
            chain: chain,
            status: 'launched data-transfer container'
        });
    }

    function handleError(error) {
        console.log(error);
        var stringError = 'Unable to download data';
        logger.error(stringError, 'data-transfer', error);
        res.status(500).json(stringError);
    }

    dockerLogic.createVolume(volumeName)
        .then(injectInfo)
        .then(applicationLogic.packedInstall)
        .then(handleSuccess)
        .catch(handleError);

});

module.exports = router;
