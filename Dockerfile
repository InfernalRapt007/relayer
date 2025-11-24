FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Bundle app source
COPY . .

# Start the relayer
CMD [ "npm", "start" ]
