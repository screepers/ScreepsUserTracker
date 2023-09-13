import * as dotenv from "dotenv";

import graphite from "graphite";
import { graphiteLogger as logger } from "../../logger.js";
import { GetShards } from "../helper.js";
import { GetUsername, GetUsernames } from "../../rooms/userHelper.js";
import handleUsers from "../handle/users.js";
import { GetGameTime } from "../screepsApi.js";

dotenv.config();

const client = graphite.createClient(
  `plaintext://${process.env.GRAPHITE_HOST}/`
);

export default class BaseDataBroker {
  static _users = {};

  static _lastTickTimestamp = {};

  static _shards = GetShards();

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

  static AddRooms(username, shard, rooms, force = false) {
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
      if (!this._users[username][shard][roomName] || force)
        this._users[username][shard][roomName] = null;
    });
  }

  static AddRoomData(username, shard, roomName, data) {
    if (!this._users[username]) return;
    if (!this._users[username][shard]) return;
    if (this._users[username][shard][roomName] === undefined) return;

    this._users[username][shard][roomName] = data;

    this.CheckUsers();
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
