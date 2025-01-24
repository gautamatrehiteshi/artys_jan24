FROM node:8.9.4

# Create app directory
WORKDIR /usr/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ./package.json ./package.json
RUN npm install

COPY ./exportModel.js ./exportModel.js
COPY ./index.js ./index.js
COPY ./test ./test
COPY ./src ./src
