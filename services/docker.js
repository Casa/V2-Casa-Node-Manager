/*
All docker management goes here.
 */

var Docker = require('dockerode');
var docker = new Docker();
var q = require('q');

const auth = {
  username: process.env.DOCKER_USERNAME,
  password: process.env.DOCKER_PASSWORD,
  serveraddress: 'https://index.docker.io/v1',
  //auth: '',
  //email: 'borglin.me@gmail.com'
};

function getContainer(containerName) {
  return docker.getContainer(containerName);
}

function getContainers(all) {
  var deferred = q.defer();

  docker.listContainers({all: all}, function (error, containers) {

    if(error)  {
      deferred.reject(error);
    } else {
      deferred.resolve(containers);
    }
  });

  return deferred.promise;
}

function getRunningContainers() {
  return getContainers(false);
}

function getAllContainers() {
  return getContainers(true);
}

function getDigestFromPullOutput(events) {
  var digest = '';

  for(var i = 0; i < events.length; i++) {

    if(events[i].status.includes("Digest")) {
      //example status
      //'Digest: sha256:9e347affc725efd3bfe95aa69362cf833aa810f84e6cb9eed1cb65c35216632a'
      digest = events[i].status.split(' ')[1];
    }
  }
  return digest;
}

function getImage(digest) {

  var deferred = q.defer();

  function returnImage(images) {
    for(var i = 0; i < images.length; i++) {
      for(var j = 0; images[i].RepoDigests && j < images[i].RepoDigests.length; j++) {
        if(images[i].RepoDigests[j].includes(digest)) {
          deferred.resolve(images[i]);
        }
      }
    }

    deferred.reject('image not found: '+ imageId);
  }

  listImages()
    .then(returnImage);

  return deferred.promise;
}

function pullImage(applicationName) {
  var deferred = q.defer();

  //TODO remove auth once casacomputer images are made public
  docker.pull(applicationName, { authConfig: auth },function (error, stream) {
    // streaming output from pull...

    if(error)  {
      deferred.reject(error);
    } else {

      docker.modem.followProgress(stream, onFinished, onProgress);

      function onFinished(err, output) {
        if(err) {
          console.log("error")
        }

        var digest = getDigestFromPullOutput(output);

        //todo what happens on timeout?
        deferred.resolve(digest);
      }
      function onProgress(event) {
        //console.log(event);
      }


    }
  });

  return deferred.promise;
}

function listImages() {
  var deferred = q.defer();

  docker.listImages(function (error, images) {

    if (error) {
      deferred.reject(error);
    } else {
      deferred.resolve(images);
    }
  });

  return deferred.promise;
}

function runImage(image) {
  var deferred = q.defer();

  var id = image.Id.split('sha256:')[1];

  docker.createContainer({
    Image: id,
    AttachStdin: false,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    Cmd: ['/bin/bash'],
    OpenStdin: false,
    StdinOnce: false,
    Name: 'testing'
  }).then(function(container) {
    deferred.resolve(container.start());
  }).catch(function(error) {
    console.log(error);
    deferred.reject(error);
  });

  return deferred.promise;
}

function stop(containerName) {
  docker.getContainer(containerName).stop();
}

function stopAll() {
  docker.listContainers(function (err, containers) {
    containers.forEach(function (containerInfo) {
      docker.getContainer(containerInfo.Id).stop(cb);
    });
  });
}

module.exports = {
  getAllContainers: getAllContainers,
  getContainer: getContainer,
  getImage: getImage,
  getRunningContainers: getRunningContainers,
  pullImage: pullImage,
  runImage: runImage,
  stop: stop,
  stopAll: stopAll
};