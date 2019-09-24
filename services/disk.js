/**
 * Generic disk functions.
 */

const logger = require('utils/logger');
const fs = require('fs');
const fse = require('fs-extra');
const crypto = require('crypto');
const uint32Bytes = 4;

// Deletes a file from the filesystem
function deleteFile(filePath) {
  return new Promise((resolve, reject) => fs.unlink(filePath, (err, str) => {
    if (err) {
      reject(err);
    } else {
      resolve(str);
    }
  }));
}

async function copyFolder(fromFile, toFile) {
  return new Promise((resolve, reject) => fse.copy(fromFile, toFile, err => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  }));
}

async function deleteFoldersInDir(path) {

  const contents = fs.readdirSync(path);

  for (const item of contents) {
    if (fs.statSync(path + '/' + item).isDirectory()) {
      deleteFolderRecursive(path + '/' + item);
    }
  }
}

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    const contents = fs.readdirSync(path);

    for (const file of contents) {
      const curPath = path + '/' + file;
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    }
    fs.rmdirSync(path);
  }
}

async function moveFoldersToDir(fromDir, toDir) {

  const contents = fs.readdirSync(fromDir);

  for (const item of contents) {
    if (item !== '.git' && fs.statSync(fromDir + '/' + item).isDirectory()) {
      await copyFolder(fromDir + '/' + item, toDir + '/' + item);
    }
  }
}

// Reads a file. Wraps fs.readFile into a native promise
function readFile(filePath, encoding) {
  return new Promise((resolve, reject) => fs.readFile(filePath, encoding, (err, str) => {
    if (err) {
      reject(err);
    } else {
      resolve(str);
    }
  }));
}

// Reads a file as a utf8 string. Wraps fs.readFile into a native promise
function readUtf8File(filePath) {
  return readFile(filePath, 'utf8');
}

function readJsonFile(filePath) {
  return readUtf8File(filePath).then(JSON.parse);
}

// Writes a string to a file. Wraps fs.writeFile into a native promise
// This is _not_ concurrency safe, so don't export it without making it like writeJsonFile
function writeFile(filePath, data, encoding) {
  return new Promise((resolve, reject) => fs.writeFile(filePath, data, encoding, err => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  }));
}

function writeJsonFile(filePath, obj) {
  const tempFileName = `${filePath}.${crypto.randomBytes(uint32Bytes).readUInt32LE(0)}`;

  return writeFile(tempFileName, JSON.stringify(obj), 'utf8')
    .then(() => new Promise((resolve, reject) => fs.rename(tempFileName, filePath, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })))
    .catch(err => {
      if (err) {
        fs.unlink(tempFileName, err => {
          logger.warn('Error removing temporary file after error', 'disk', {err, tempFileName});
        });
      }
      throw err;
    });
}

function writeKeyFile(filePath, obj) {
  const tempFileName = `${filePath}.${crypto.randomBytes(uint32Bytes).readUInt32LE(0)}`;

  return writeFile(tempFileName, obj, 'utf8')
    .then(() => new Promise((resolve, reject) => fs.rename(tempFileName, filePath, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })))
    .catch(err => {
      if (err) {
        fs.unlink(tempFileName, err => {
          logger.warn('Error removing temporary file after error', 'disk', {err, tempFileName});
        });
      }
      throw err;
    });
}

module.exports = {
  deleteFile,
  deleteFoldersInDir,
  moveFoldersToDir,
  readFile,
  readUtf8File,
  readJsonFile,
  writeJsonFile,
  writeKeyFile
};
