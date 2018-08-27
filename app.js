require('module-alias/register');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const passport = require('passport');
const cors = require('cors');

const requestCorrelationMiddleware = require('@middlewares/requestCorrelationId.js'); // eslint-disable-line id-length
const errorHandleMiddleware = require('@middlewares/errorHandling.js');
require('@middlewares/auth.js');

const logger = require('@utils/logger.js');
const applicationLogic = require('@logic/application.js');

const ping = require('@routes/ping.js');
const telemetry = require('@routes/v1/telemetry.js');
const device = require('@routes/v1/device.js');
const app = express();

// Whitelist origins for dev & demo site
// TODO: cleanup before release
const whitelist = ['http://localhost:80', 'http://localhost:3000', 'http://spacefleet.com.s3-website-us-east-1.amazonaws.com']; // eslint-disable-line max-len
const corsOptions = {
  origin: function(origin, callback) { // eslint-disable-line object-shorthand
    if (whitelist.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());

app.use(requestCorrelationMiddleware);
app.use(morgan(logger.morganConfiguration));
app.use('/ping', ping);
app.use('/v1/device', device);
app.use('/v1/telemetry', telemetry);

app.use(errorHandleMiddleware);
app.use(function(req, res) {
  res.status(404).json(); // eslint-disable-line no-magic-numbers
});

applicationLogic.createSettingsFile();

module.exports = app;
