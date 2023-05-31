import graphite from "graphite";
import winston from "winston";
import { GetUsernames } from "../rooms/userHelper.js";
import handleUsers from "./handle/users.js";
import handleObjects from "./handle/objects.js";
import { getStats, handleCombinedRoomStats } from "./handle/helper.js";
import * as dotenv from "dotenv"

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

export default class DataBroker {
  static _users = {};

  static Reset() {
    this._users = {};
  }

  static AddRooms(username, shard, rooms) {
    if (!this._users[username]) {
      this._users[username] = {};
    }
    if (!this._users[username][shard]) {
      this._users[username][shard] = {};
    }

    rooms.forEach((roomName) => {
      if (!this._users[username][shard][roomName])
        this._users[username][shard][roomName] = null;
    });
  }

  static AddRoomData(username, shard, roomName, data) {
    if (!this._users[username]) return;
    if (!this._users[username][shard]) return;
    if (this._users[username][shard][roomName] === undefined) return;

    this._users[username][shard][roomName] = data;
  }

  static CheckUsers() {
    Object.entries(this._users).forEach(([username, shards]) => {
      let hasUndefinedData = false;

      Object.values(shards).forEach((rooms) => {
        Object.values(rooms).forEach((roomData) => {
          if (!roomData) hasUndefinedData = true;
        });
      });

      if (!hasUndefinedData) {
        this.UploadUser(username);
      }
    });


  }
   static async UploadStatus(ipStatus) {
    const usernames = GetUsernames();

    const stats = {}
    let handledUsernames = await handleUsers(usernames);
    Object.entries(handledUsernames).forEach(([username, userStats]) => {
      stats[username] = { overview: { roomCounts: userStats } };
    });

    this.Upload({ status: ipStatus, stats });
  }
  static UploadUser(username) {
    let timestamp;

    const stats = {
      shards: {},
      overview: {
        shards: {}
      }
    }
    const userStats = this._users[username];
    Object.values(userStats).forEach((shardData) => {
      Object.values(shardData).forEach((roomData) => {
        const { dataResult, dataRequest } = roomData;
        if (!timestamp) {
          timestamp = dataResult.timestamp;
        }

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

        if (!stats.shards[dataRequest.shard]) {
          stats.shards[dataRequest.shard] = {};
        }
        stats.shards[dataRequest.shard][
          dataRequest.room
        ] = getStats(actionsArray);
        stats.overview.shards = handleCombinedRoomStats(
          stats.shards
        );
      })
    })

    this.Upload({ stats: { [username]: stats } });
  }

  static Upload(data, timestamp) {
    const _timestamp = timestamp || Date.now();

    if (process.env.GRAPHITE_ONLINE === "FALSE") return;
    client.write({ screeps: { userTracker: data } }, _timestamp, (err) => {
      if (err) {
        logger.error(err);
      }
    });
  }
}
