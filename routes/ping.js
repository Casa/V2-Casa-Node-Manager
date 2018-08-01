const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {

    //TODO: constant from file?
    var result = {
        version: "manager-0.1"
    };

    res.json(result);
});

module.exports = router;
