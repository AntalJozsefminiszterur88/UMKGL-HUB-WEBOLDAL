FROM node:18-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache ffmpeg

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000
CMD [ "node", "src/server.js" ]
