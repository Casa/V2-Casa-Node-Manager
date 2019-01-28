# specify the node base image with your desired version node:<version>
FROM node:8

ARG GITHUB_USER
ARG GITHUB_PASS

# install tools
RUN apt-get update \
  && apt-get install -y vim \
  && apt-get install rsync -y

# Create app directory
WORKDIR /usr/src/app

# inject yml files if available
RUN if [ ! -z "$GITHUB_USER" ] && [ ! -z "$GITHUB_PASS" ] ; then \
    git clone https://$GITHUB_USER:$GITHUB_PASS@github.com/Casa/home-compute-warehouse --depth 1 /warehouse; \
    rsync -av --exclude=update-manager.yml /warehouse/lightning-node/*.yml ./resources; \
  fi

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

RUN gpg --import ./resources/node-logs.asc

LABEL casa=persist

EXPOSE 3000
CMD [ "npm", "start" ]
