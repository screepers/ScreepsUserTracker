# syntax=docker/dockerfile:1

FROM node:18.18.0
ENV NODE_ENV=production

WORKDIR /usr/app
COPY . .

RUN npm install --production

CMD [ "node", "src/index.js" ]