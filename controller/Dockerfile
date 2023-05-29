# syntax=docker/dockerfile:1

FROM node:16.19.0
ENV NODE_ENV=production

WORKDIR /app
COPY . .

# COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

CMD [ "node", "src/fm.js" ]