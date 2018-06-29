const dockerComposeUpCommand = 'sudo docker run -it \\\n' +
  '    -v /var/run/docker.sock:/var/run/docker.sock \\\n' +
  '    -v /usr/bin/docker:/usr/bin/docker \\\n' +
  '    -v /usr/local/current-app-yaml:/usr/local/current-app-yaml \\\n' +
  '    casacomputer/docker-compose-arm \\\n' +
  '    --file /usr/local/current-app-yaml/docker-compose.yaml up -d';

/*
Returns the docker compose up command with the given filename. If the filename does
not exist or is not found, the default file name of docker-compose.yaml is used.
 */
function getDockerComposeUpCommand(fileName) {
  return dockerComposeCommand.replace('docker-compose.yaml', fileName);
}

function dockerComposeUp(application) {
  dir = exec("echo 'testing exec'", function(err, stdout, stderr) {
    if (err) {
      // should have err.code here?
    }
    console.log(stdout);
  });

  dir.on('exit', function (code) {
    // exit code is code
    console.log(code);
  });

}
module.exports = {
  dockerComposeUp: dockerComposeUp
};