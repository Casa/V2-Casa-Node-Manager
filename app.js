const express = require('express');
const path = require('path');

const bodyParser = require('body-parser');
const session = require('express-session');

const morgan = require('morgan');
require('dotenv').config();

const requestCorrelationMiddleware = require('./resources/requestCorrelationId.js');
const logger = require('./resources/logger.js');

const container = require('./routes/v1/container.js');
const helloworld = require('./routes/helloworld.js');
const install = require('./routes/v1/install.js');
const uninstall = require('./routes/v1/uninstall.js');
const volume = require('./routes/v1/volume.js');
const download = require('./routes/v1/download.js');
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

var sessionSecret = 'supersecret';
if(process.env.SESSION_SECRET) {
  sessionSecret = process.env.SESSION_SECRET;
}


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true
  })
);
app.use(express.static(path.join(__dirname, 'public')));

app.use(requestCorrelationMiddleware);
app.use(morgan(logger.morganConfiguration));
app.use('/v1/container', container);
app.use('/helloworld', helloworld);
app.use('/v1/install', install);
app.use('/v1/uninstall', uninstall);
app.use('/v1/volume', volume);
app.use('/v1/download', download);

app.use(function(req, res) {
  res.status(404).json();
});

module.exports = app;
