const express = require('express');
const router = express.Router();

const dockerLogic = require('../../logic/docker.js');
const logger = require('../../resources/logger.js');
const validator = require('../../resources/validator.js');

const applicationLogic = require('../../logic/application.js');


router.get('/', function(req, res, next) {

    var result = {
        version: "0.1"
    };

    res.json(result);
});


router.get('/:name/:network', function (req, res) {

    const name = req.params.name;
    const network = req.params.network;

    try {
        validator.isAlphanumeric(name);
        validator.isValidNetwork(network);
    } catch (error) {
        res.status(400).json(error);
        return;
    }

    const volumeName = 'currentappyaml_' + name + '-data';

    function injectInfo() {
        return {
            container: 'data-transfer',
            chain: name
        };
    }

    function handleSuccess() {
        res.json({
            application: name,
            network: network,
            status: 'installed'
        });
    }

    function handleError(error) {
        console.log(error);
        var stringError = 'Unable to find any available applications';
        logger.error(stringError, 'install', error);
        res.status(500).json(stringError);
    }

    dockerLogic.createVolume(volumeName)
        .then(injectInfo)
        .then(applicationLogic.packedInstall)
        .then(handleSuccess)
        .catch(handleError);

});

module.exports = router;
