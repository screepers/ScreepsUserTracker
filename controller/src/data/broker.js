import graphite from "graphite";
import * as dotenv from "dotenv";
import { GetUsernames } from "../rooms/userHelper.js";
import handleUsers from "./handle/users.js";
import handleObjects from "./handle/objects.js";
import { getStats, handleCombinedRoomStats } from "./handle/helper.js";
import { graphiteLogger as logger } from "../logger.js";
import {GetShards} from "./helper.js";
import {GetGameTime} from "./screepsApi.js";

dotenv.config();
const client = graphite.createClient(
  `plaintext://${process.env.GRAPHITE_HOST}/`
);

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

  static async CheckUsers() {
    const usernamesToUpload = [];

    Object.entries(this._users).forEach(([username, shards]) => {
      let hasUndefinedData = false;

      Object.values(shards).forEach((rooms) => {
        Object.values(rooms).forEach((roomData) => {
          if (!roomData) hasUndefinedData = true;
        });
      });

      if (!hasUndefinedData) {
        usernamesToUpload.push(username);
      }
    });

    if (usernamesToUpload.length) await this.UploadUsers(usernamesToUpload);
  }

  static async UploadStatus(ipStatus) {
    const start = Date.now();
    const usernames = GetUsernames();

    const stats = {};
    const handledUsernames = await handleUsers(usernames);
    Object.entries(handledUsernames).forEach(([username, userStats]) => {
      stats[username] = { overview: { roomCounts: userStats } };
    });

    this.Upload({ status: ipStatus, stats }, undefined, {
      start,
      type: "Status",
    });
  }

  static async UploadUsers(usernames) {
    const start = Date.now();
    let timestamp;

    const stats = {};
    function getStatsObject() {
      return {
        shards: {},
        overview: {
          shards: {},
        },
      };
    }

    usernames.forEach((username) => {
      const userStats = getStatsObject();
      Object.values(this._users[username]).forEach((shardData) => {
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

          if (!userStats.shards[dataRequest.shard]) {
            userStats.shards[dataRequest.shard] = {};
          }
          userStats.shards[dataRequest.shard][dataRequest.room] =
            getStats(actionsArray);
          userStats.overview.shards = handleCombinedRoomStats(userStats.shards);
        });

        stats[username] = userStats;
      });
    });

    const ticks = {}
    const shards = GetShards();
    for (let s = 0; s < shards.length; s++) {
      const shard = shards[s];
      ticks[shard] = await GetGameTime(shard);
    }

    this.Upload({ stats, ticks }, timestamp, {
      start,
      type: "Users",
    });
  }

  static Upload(data, timestamp, logInfo) {
    const _timestamp = timestamp || Date.now();

    if (process.env.GRAPHITE_ONLINE === "FALSE") return;
    client.write({ screeps: { userTracker: { [process.env.SERVER_TYPE]: data } } }, _timestamp, (err) => {
      if (logInfo)
        logger.info(
          `Written data for ${logInfo.type}, took ${(
            (Date.now() - logInfo.start) /
            1000
          ).toFixed(2)}s`
        );
      if (err) {
        logger.error(err);
      }
    });
  }
}
