const express = require('express');
const pjson = require('../package.json');
const router = express.Router();

router.get('/', function(req, res) {
    var result = {
        version: "manager-" + pjson.version
    };

    res.json(result);
});

module.exports = router;
