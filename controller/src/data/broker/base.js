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
  _users = {};

  _lastTickTimestamp = {};

  _shards = GetShards();

  async UploadStatus(ipStatus) {
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

    await BaseDataBroker.Upload(
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

  AddRooms(username, shard, rooms, force = false) {
    if (!this._users[username]) {
      this._users[username] = {};
    }
    if (!this._users[username][shard]) {
      this._users[username][shard] = {};
    }

    if (force) this.RemoveUploadedData(username, shard, rooms);

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

  async AddRoomsData(dataList) {
    if (dataList.length === 0) return;

    dataList.sort((a, b) => a.dataRequest.tick - b.dataRequest.tick);

    let lastTick = dataList[0].dataRequest.tick;
    for (let i = 0; i < dataList.length; i += 1) {
      const { dataRequest } = dataList[i];

      if (lastTick !== dataRequest.tick) {
        lastTick = dataRequest.tick;
        await this.CheckUsers();
      }

      let username;
      switch (dataRequest.type) {
        case "main":
          username = GetUsername(dataRequest.room, dataRequest.shard);
          break;
        case "reactor":
          username = "reactor";
          break;
        default:
          break;
      }

      this.AddRoomData(
        username,
        dataRequest.shard,
        dataRequest.room,
        dataList[i]
      );
    }

    await this.CheckUsers();
  }

  AddRoomData(username, shard, roomName, data) {
    if (!this._users[username]) return;
    if (!this._users[username][shard]) return;
    if (this._users[username][shard][roomName] === undefined) return;

    this._users[username][shard][roomName] = data;
  }

  async CheckUsers() {
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

      if (process.env.GRAPHITE_ONLINE !== "TRUE") return;
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
