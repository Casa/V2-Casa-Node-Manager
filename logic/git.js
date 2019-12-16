const bashService = require('services/bash.js');
const constants = require('utils/const.js');

const GIT_COMMAND = 'git';
const WAREHOUSE_URL = 'github.com/Casa/V2-Casa-Node-Warehouse';

function addDefaultOptions(options) {
  options.cwd = constants.WORKING_DIRECTORY;
  options.log = true;
}

// Clone
async function clone(options) {

  addDefaultOptions(options);

  let url = 'https://';

  if (process.env.REPOSITORY_ADDENDUM && process.env.CASABUILDER_GIT_PASSWORD) {
    url += 'casabuilder:' + process.env.CASABUILDER_GIT_PASSWORD + '@' + WAREHOUSE_URL
      + process.env.REPOSITORY_ADDENDUM;
  } else {
    url += 'www.' + WAREHOUSE_URL;
  }

  const commandArgs = ['clone',
    url,
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
