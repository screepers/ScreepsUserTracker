import graphite from "graphite";
import winston from "winston";
import * as dotenv from "dotenv";
import { GetUsernames, GetUsername } from "../rooms/userHelper.js";
import handleUsers from "./handle/users.js";
import handleObjects from "./handle/objects.js";
import { getStats, handleCombinedRoomStats } from "./handle/helper.js";

dotenv.config();
const client = graphite.createClient(
  `plaintext://${process.env.GRAPHITE_HOST}/`
);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "logs/graphite.log" })],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

function Send(data, timestamp) {
  if (process.env.GRAPHITE_ONLINE === "FALSE") return;
  client.write(data, timestamp, (err) => {
    if (err) {
      logger.error(err);
    }
  });
}

function UploadData(dataList, status) {
  const startTime = Date.now();
  const stats = {};

  const usernames = GetUsernames();
  const usersStats = handleUsers(usernames);
  Object.entries(usersStats).forEach(([username, userStats]) => {
    stats[username] = { overview: { roomCounts: userStats }, shards: {} };
  });

  if (dataList.length === 0) {
    return;
  }
  let timestamp;
  for (let i = 0; i < dataList.length; i += 1) {
    const { dataResult, dataRequest } = dataList[i];
    if (!timestamp) {
      timestamp = dataResult.timestamp;
    }

    const username = GetUsername(dataRequest.room, dataRequest.shard);
    if (username) {
      let actionsArray = [];
      const { ticks } = dataResult;
      const tickKeys = Object.keys(ticks);
      for (let t = 0; t < tickKeys.length; t += 1) {
        const tick = tickKeys[t];
        if (ticks[tick]) {
          actionsArray = actionsArray.concat(
            handleObjects(
              username,
              ticks[tick],
              ticks[tickKeys[t - 1]],
              dataResult.ticks[dataRequest.tick]
            )
          );
        }
      }

      if (!stats[username].shards[dataRequest.shard]) {
        stats[username].shards[dataRequest.shard] = {};
      }
      if (!stats[username].shards[dataRequest.shard][dataRequest.tick]) {
        stats[username].shards[dataRequest.shard][dataRequest.tick] = {};
      }
      stats[username].shards[dataRequest.shard][dataRequest.tick][
        dataRequest.room
      ] = getStats(actionsArray);
    }
  }

  const tickStats = [];
  Object.entries(stats).forEach(([username, userStats]) => {
    const shardKeys = Object.keys(userStats.shards);
    for (let i = 0; i < shardKeys.length; i += 1) {
      const shard = shardKeys[i];
      const ticks = Object.keys(userStats.shards[shard]);

      for (let t = 0; t < ticks.length; t += 1) {
        if (!tickStats[t]) {
          tickStats[t] = {};
        }
        if (!tickStats[t][username]) {
          tickStats[t] = {
            [username]: {
              shards: {
                [shard]: userStats.shards[shard][ticks[t]],
              },
              overview: {
                shards: {},
              },
            },
          };
        } else if (!tickStats[t][username].shards[shard]) {
          tickStats[t][username].shards[shard] =
            userStats.shards[shard][ticks[t]];
        }

        tickStats[t][username].overview.shards = handleCombinedRoomStats(
          tickStats[t][username].shards
        );
      }
    }
  });

  logger.info(
    `Sending ${dataList.length} room's data to graphite, took ${Math.round(
      (Date.now() - startTime) / 1000
    )} seconds to process the data`
  );
  tickStats.forEach((stats) => {
    Send(stats, timestamp);
  });
  setTimeout(() => {
    Send({ users: stats }, timestamp);
  }, 2000);
}

export default UploadData;
