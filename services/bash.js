const childProcess = require('child_process');

//Set VERSTION. It is needed in the yml files to pull the proper tag
process.env.VERSION = process.env.ARCHITECTURE;

/**
 * Converts supplied yml files to cli arguments
 * https://docs.docker.com/compose/reference/overview/#use--f-to-specify-name-and-path-of-one-or-more-compose-files
 * @param {?(string|string[])} config
 */
const configToArgs = config => {
  if (typeof config === 'undefined') {
    return [];
  } else if (typeof config === 'string') {
    return [ '-f', config ];
  } else if (config instanceof Array) {
    return config.reduce((args, item) => args.concat([ '-f', item ]), []);
  }
  throw new Error(`Invalid argument supplied: ${config}`);
};

function extendProcessEnv(env) {
  Object.keys(env).map(function(objectKey) {
    process.env[objectKey] = env[objectKey];
  });
}

/**
 * TODO this function should be a singleton. Because it changes env variables, there would be the possibility for errors
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
const execCompose = (command, args, options) => new Promise((resolve, reject) => {
  const composeArgs = configToArgs(options.config).concat([ command ], args);
  const cwd = options.cwd;
  const env = options.env || null;

  extendProcessEnv(env);

  const childProc = childProcess.spawn('docker-compose', composeArgs, { cwd });

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

/**
 *
 Run the docker compose image in the working directory. It looks for a file called docker-compose.yaml. It will run
 docker-compuse up and start the image.

 TODO we should use the --file command and explicity call out which docker compose file we are using. This avoids
 having to copy the file into a directory on its own.

 * @param {object} options
 * @param {string} options.cwd
 * @param {boolean} [options.log]
 * @param {?(string|string[])} [options.config]
 * @param {?object} [options.env]
 */

const up = function (options) {
  return execCompose('up', [ '-d', '--force-recreate'], options);
};

/**
 * @param {object} options
 * @param {string} options.cwd
 * @param {boolean} [options.log]
 * @param {?(string|string[])} [options.config]
 * @param {?object} [options.env]
 */
const down = function (options) {
  return execCompose('down', [], options);
};

module.exports = { up, down};