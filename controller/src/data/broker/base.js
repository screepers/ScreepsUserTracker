import * as dotenv from "dotenv";

import graphite from "graphite";
import { graphiteLogger as logger } from "../../logger.js";
import { GetShards } from "../helper.js";
import { GetUsernames } from "../../rooms/userHelper.js";
import handleUsers from "../handle/users.js";
import { GetGameTime } from "../screepsApi.js";

dotenv.config();

const client = graphite.createClient(
  `plaintext://${process.env.GRAPHITE_HOST}/`
);

export default class BaseDataBroker {
  static _users = {};

  static _shards = GetShards();

  static _lastTickTimestamp = {};

  static async UploadStatus(ipStatus) {
    const start = Date.now();
    const usernames = GetUsernames();

    const stats = {};
    const handledUsernames = await handleUsers(usernames);
    Object.entries(handledUsernames).forEach(([username, userStats]) => {
      stats[username] = { info: userStats };
    });

    const liveTicks = {};
    for (let t = 0; t < this._shards.length; t += 1) {
      const shardName = this._shards[t];
      liveTicks[shardName] = await GetGameTime(shardName);
    }

    await this.Upload(
      {
        status: ipStatus,
        ticks: {
          live: liveTicks,
        },
        users: stats,
      },
      undefined,
      {
        start,
        type: "Status",
      }
    );
  }

  static AddRooms(username, shard, rooms) {
    if (!this._users[username]) {
      this._users[username] = {};
    }
    if (!this._users[username][shard]) {
      this._users[username][shard] = {};
    }

    const knownRoomNames = Object.keys(this._users[username][shard]);
    knownRoomNames.forEach((roomName) => {
      if (!this._users[username][shard][roomName])
        delete this._users[username][shard][roomName];
    });

    rooms.forEach((roomName) => {
      if (!this._users[username][shard][roomName])
        this._users[username][shard][roomName] = [];
    });
  }

  static AddRoomData(username, shard, roomName, data) {
    if (!this._users[username]) return;
    if (!this._users[username][shard]) return;
    if (this._users[username][shard][roomName] === undefined) return;

    this._users[username][shard][roomName].push(data);
  }

  static async CheckUsers() {
    for (const username in this._users) {
      let lowestRoomDataCount = 0;
      if (Object.hasOwnProperty.call(this._users, username)) {
        const shards = this._users[username];
        for (const shardName in shards) {
          if (Object.hasOwnProperty.call(shards, shardName)) {
            const rooms = shards[shardName];
            for (const roomName in rooms) {
              if (Object.hasOwnProperty.call(rooms, roomName)) {
                const roomData = rooms[roomName];
                if (roomData.length < lowestRoomDataCount)
                  lowestRoomDataCount = roomData.length;
              }
            }
          }
        }

        for (let i = 0; i < lowestRoomDataCount; i++) {
          await this.UploadUsers(username)
        }
      }
    }
  }

  static async Upload(data, timestamp, logInfo) {
    return new Promise((resolve) => {
      const _timestamp = timestamp || Date.now();

      if (process.env.GRAPHITE_ONLINE !== "TRUE") return resolve();

      client.write(
        { screeps: { userTracker: { [process.env.SERVER_TYPE]: data } } },
        _timestamp,
        (err) => {
          if (err) {
            logger.error(err);
          } else if (logInfo)
            logger.info(
              `Written data for ${logInfo.type}, took ${(
                (Date.now() - logInfo.start) /
                1000
              ).toFixed(2)}s`
            );

          resolve();
        }
      );
    });
  }
}