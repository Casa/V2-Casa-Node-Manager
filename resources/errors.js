/* eslint-disable no-magic-numbers */

function ValidationError(message, statusCode) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.statusCode = statusCode || 400;
}
require('util').inherits(ValidationError, Error);

function DockerComposeError(message, error, statusCode) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.error = error;
  this.message = message;
  this.statusCode = statusCode;
}
require('util').inherits(DockerComposeError, Error);

function DockerError(message, statusCode) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.statusCode = statusCode;
}
require('util').inherits(DockerError, Error);

function DockerHubError(message, error, statusCode) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.error = error;
  this.statusCode = statusCode;
}
require('util').inherits(DockerHubError, Error);

module.exports = {
  ValidationError,
  DockerComposeError,
  DockerError,
  DockerHubError,
};

