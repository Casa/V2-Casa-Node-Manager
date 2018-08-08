Introduction
============

The manager api controls how applications and chains are managed on device. It is responsible for starting, stopping,
restarting, installing, and uninstalling all applications, chains, and data.

---------

Getting Started

*Prerequisites: `node`.*

  1. Run `make install`
  1. Copy .env.default file to .env and supply environment variables
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


