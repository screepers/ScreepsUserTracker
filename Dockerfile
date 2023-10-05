# syntax=docker/dockerfile:1

FROM node:16.17.0
ENV NODE_ENV=production

WORKDIR "/app"
COPY . .

WORKDIR "/app/getter"
RUN npm install

WORKDIR "/app/controller"

RUN npm install
CMD ["node", "src/index.js"]
