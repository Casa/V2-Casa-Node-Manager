const express = require('express');
const path = require('path');

const bodyParser = require('body-parser');
const session = require('express-session');
const requestCorrelationMiddleware = require('./resources/requestCorrelationId.js');

const logger = require('./resources/logger.js');

const morgan = require('morgan');

const application = require('./routes/v1/application.js');
const chain = require('./routes/v1/chain.js');
const container = require('./routes/v1/container.js');
const helloworld = require('./routes/helloworld.js');
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

app.use('/v1/application', application);
app.use('/v1/chain', chain);
app.use('/v1/container', container);
app.use('/helloworld', helloworld);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
      res.status(err.status || 500);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
});

module.exports = app;
