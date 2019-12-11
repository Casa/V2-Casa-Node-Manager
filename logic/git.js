const bashService = require('services/bash.js');
const constants = require('utils/const.js');

const GIT_COMMAND = 'git';

function addDefaultOptions(options) {
  options.cwd = constants.WORKING_DIRECTORY;
  options.log = true;
}

// Clone
async function clone(options) {

  addDefaultOptions(options);

  const commandArgs = ['clone',
    'https://casabuilder:' + process.env.CASABUILDER_GIT_PASSWORD + '@github.com/Casa/V2-Casa-Node-Warehouse'
    + process.env.REPOSITORY_ADDENDUM,
    '--depth', '1', '--single-branch', constants.TMP_BUILD_ARTIFACTS_DIRECTORY];

  try {
    await bashService.exec(GIT_COMMAND, commandArgs, options);
  } catch (error) {
    throw new Error('Unable to git clone');
  }
}

module.exports = {
  clone,
};
