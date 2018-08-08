/* eslint-disable no-magic-numbers */

function ValidationError(message, statusCode) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.statusCode = statusCode || 400;
}
require('util').inherits(ValidationError, Error);

function DockerComposeError(message, statusCode) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
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

module.exports = {
  ValidationError,
  DockerComposeError,
  DockerError,
};

