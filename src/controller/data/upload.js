import graphite from "graphite";
import winston from "winston";
import { GetUsernames, GetUsername } from "../rooms/userHelper.js";
import handleUsers from "./handle/users.js";
import handleObjects from "./handle/objects.js";
import {getStats} from "./handle/helper.js";
const graphitePort = 8080;
const client = graphite.createClient(`plaintext://localhost:${graphitePort}/`);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "logs/graphite.log" })],
});

function Send(data, timestamp) {
  client.write(data, timestamp, (err) => {
    if (err) {
      logger.error(err);
    }
  });
}

function group(previous, current) {
  if (Array.isArray(current)) {
    for (let i = 0; i < current.length; i++) {
      const currentElement = current[i];
      const previousElement = previous[i];
      if (!previousElement) {
        previous[i] = currentElement;
        continue;
      }
      group(previousElement, currentElement);
    }
  } else if (typeof current === "object") {
    const keys = Object.keys(current);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const currentElement = current[key];
      const previousElement = previous[key];
      if (!previousElement) {
        previous[key] = currentElement;
        continue;
      }
      group(previousElement, currentElement);
    }
  } else {
    previous += current;
  }
}

function divide100(current) {
  if (Array.isArray(current)) {
    for (let i = 0; i < current.length; i++) {
      const currentElement = current[i];
      divide100(currentElement);
    }
  } else if (typeof current === "object") {
    const keys = Object.keys(current);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const currentElement = current[key];
      divide100(currentElement);
    }
  } else {
    current /= 100;
  }
}

function groupObjects(objectsArray) {
  let grouped = {};
  for (let i = 0; i < objectsArray.length; i++) {
    group(grouped, objectsArray[i]);
  }
  return grouped;
}

export default function UploadData(dataList) {
  const stats = {
    users: {},
  };

  const usernames = GetUsernames();
  const userStats = handleUsers(usernames);
  Object.entries(userStats).forEach(([username, userStats]) => {
    stats.users[username] = { overview: userStats, shards: {} };
  });

  if (dataList.length === 0) {
    return;
  }
  let timestamp;
  for (let i = 0; i < dataList.length; i++) {
    const { dataResult, dataRequest } = dataList[i];
    if (!timestamp) {
      timestamp = dataResult.timestamp;
    }

    const username = GetUsername(dataRequest.room, dataRequest.shard);
    if (!username) {
      continue;
    }

    let actionsArray = [];
    const { ticks } = dataResult;
    const tickKeys = Object.keys(ticks);
    for (let t = 0; t < tickKeys.length; t++) {
      const tick = tickKeys[t];
      if (ticks[tick] === null) {
        continue;
      }

      actionsArray = actionsArray.concat(
        handleObjects(
          ticks[tick],
          ticks[tickKeys[t - 1]],
          dataResult.ticks[dataRequest.tick] , username
        )
      );
    }

    if (!stats.users[username].shards[dataRequest.shard]) {
      stats.users[username].shards[dataRequest.shard] = {};
    }
    stats.users[username].shards[dataRequest.shard][dataRequest.room] = getStats(actionsArray);
  }

  Send(stats, timestamp);
}
