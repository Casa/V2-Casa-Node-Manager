const childProcess = require('child_process');

//Set VERSTION. It is needed in the yml files to pull the proper tag
process.env.VERSION = process.env.ARCHITECTURE;

function extendProcessEnv(env) {
  Object.keys(env).map(function(objectKey) {
    process.env[objectKey] = env[objectKey];
  });
}

/**
 * TODO Error handling
 * if multiple threads used this process.
 *
 * Executes docker-compose command with common options
 * @param {string} command
 * @param {string[]} args
 * @param {object} options
 * @param {string} options.cwd
 * @param {boolean} [options.log]
 * @param {?(string|string[])} [options.config]
 * @param {?object} [options.env]
 */
const exec = (command, args, options) => new Promise((resolve, reject) => {

  const cwd = options.cwd || null;
  const env = options.env || {};

  extendProcessEnv(env);

  const childProc = childProcess.spawn(command, args, { cwd });

  childProc.on('error', err => {
    reject(err);
  });

  const result = {
    err: '',
    out: ''
  };

  childProc.stdout.on('data', chunk => {
    result.out += chunk.toString();
  });

  childProc.stderr.on('data', chunk => {
    result.err += chunk.toString();
  });

  childProc.on('close', () => {
    resolve(result);
  });

  if (options.log) {
    childProc.stdout.pipe(process.stdout);
    childProc.stderr.pipe(process.stderr);
  }
});

module.exports = {
  exec: exec
};