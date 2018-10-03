# specify the node base image with your desired version node:<version>
FROM node:8

# Copy the YMLs into the container
RUN git clone https://casabuilder:8685f6fedc109f4b4fe6353c21971bbd1086b82c@github.com/Casa/home-compute-warehouse --depth 1 /warehouse
RUN mkdir /canonical-ymls
RUN cp /warehouse/lightning-node/*.yml /canonical-ymls
RUN rm -rf /warehouse

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

LABEL casa=persist

EXPOSE 3000
CMD [ "npm", "start" ]
