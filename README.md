Introduction
============

The manager api controls how applications and chains are managed on device. It is responsible for starting, stopping,
restarting, installing, and uninstalling all applications, chains, and data.

---------

Getting Started

  1. Install docker for mac https://docs.docker.com/v17.09/docker-for-mac/install/
  1. Clone this repo
  1. Install brew `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
  1. Install node `brew install node`
  1. Run `npm install`
  1. Run `npm start`

Running with Docker
  1. Build new image `docker build . -t casacomputer/manager-api`
  1. (Optional run in docker on raspberry pi) `sudo docker run -d -p 3000:3000 \
                                   -v /var/run/docker.sock:/var/run/docker.sock \
                                   -v /usr/bin/docker:/usr/bin/docker \
                                   -v /usr/local/all-app-yamls:/usr/local/all-app-yamls \
                                   -v /usr/local/current-app-yaml:/usr/local/current-app-yaml \
                                   casacomputer/manager-api`
  1. (Optional run in docker on mac) `docker run -d -p 3000:3000 \
                                        -v /var/run/docker.sock:/var/run/docker.sock \
                                        -v /usr/local/bin/docker:/usr/bin/docker \
                                        -v /usr/local/all-app-yamls:/usr/local/all-app-yamls \
                                        -v /usr/local/current-app-yaml:/usr/local/current-app-yaml \
                                        casacomputer/manager-api`


