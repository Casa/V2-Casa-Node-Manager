const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const morgan = require('morgan');

const requestCorrelationMiddleware = require('./resources/requestCorrelationId.js'); // eslint-disable-line id-length
const logger = require('./resources/logger.js');

const ping = require('./routes/ping.js');
const telemetry = require('./routes/v1/telemetry.js');
const device = require('./routes/v1/device.js');
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

app.use(requestCorrelationMiddleware);
app.use(morgan(logger.morganConfiguration));
app.use('/ping', ping);
app.use('/v1/device', device);
app.use('/v1/telemetry', telemetry);

app.use(function(req, res) {
  res.status(404).json(); // eslint-disable-line no-magic-numbers
});

module.exports = app;
