const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {

    var result = {
        version: "0.1"
    };

    res.json(result);
});

module.exports = router;
