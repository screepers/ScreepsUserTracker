import graphite from "graphite";
import * as dotenv from "dotenv";
import { GetUsernames, GetUsername } from "../rooms/userHelper.js";
import handleUsers from "./handle/users.js";
import handleObjects from "./handle/objects.js";
import { getStats, handleCombinedRoomStats } from "./handle/helper.js";
import { graphiteLogger as logger } from "../logger.js";

dotenv.config();
const client = graphite.createClient(
  `plaintext://${process.env.GRAPHITE_HOST}/`
);

export default class DataBroker {
  static _users = {};

  static Reset() {
    this._users = {};
  }

  static AddRooms(username, shard, rooms, force = false) {
    if (!this._users[username]) {
      this._users[username] = {};
    }
    if (!this._users[username][shard]) {
      this._users[username][shard] = {};
    }

    const knownUsers = Object.keys(this._users[username][shard]);
    knownUsers.forEach((username)=>{
      if (!this._users[username][shard][username]) delete this._users[username][shard][username]
    })

    rooms.forEach((roomName) => {
      if (!this._users[username][shard][roomName] || force)
        this._users[username][shard][roomName] = null;
    });
  }

  static async AddRoomsData(dataList) {
    if (dataList.length === 0) return;

    dataList.sort((a, b) => a.dataRequest.tick - b.dataRequest.tick);

    let lastTick = dataList[0].dataRequest.tick;
    for (let i = 0; i < dataList.length; i += 1) {
      const { dataRequest } = dataList[i];

      if (lastTick !== dataRequest.tick) {
        lastTick = dataRequest.tick;
        await this.CheckUsers();
      }

      const username = GetUsername(dataRequest.room, dataRequest.shard);
      this.AddRoomData(
        username,
        dataRequest.shard,
        dataRequest.room,
        dataList[i]
      );
    }
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
      stats[username] = { info: userStats };
    });

    this.Upload({ status: ipStatus, users: stats }, undefined, {
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
        combined: {
          shards: {},
        },
      };
    }

    const shardTicks = {};
    usernames.forEach((username) => {
      const userStats = getStatsObject();
      Object.values(this._users[username]).forEach((shardData) => {
        let hasStats = false;

        Object.values(shardData).forEach((roomData) => {
          const { dataResult, dataRequest } = roomData;
          if (dataResult) {
            hasStats = true;

            if (!timestamp) {
              timestamp = dataResult.timestamp;
            } else if (!shardTicks[dataRequest.shard]) {
              shardTicks[dataRequest.shard] = dataRequest.tick;
            }

            let actionsArray = [];
            const { ticks } = dataResult;
            const tickKeys = Object.keys(ticks);

            const currentObjects = Object.values(ticks).filter(
              (tl) => tl !== null
            )[0];

            for (let t = 0; t < tickKeys.length; t += 1) {
              const tick = tickKeys[t];
              if (ticks[tick]) {
                actionsArray = actionsArray.concat(
                  handleObjects(username, ticks[tick], {
                    previousObjects: ticks[tickKeys[t - 1]],
                    currentObjects,
                    ticks,
                    tick,
                  })
                );
              }
            }

            if (!userStats.shards[dataRequest.shard]) {
              userStats.shards[dataRequest.shard] = {};
            }
            userStats.shards[dataRequest.shard][dataRequest.room] =
              getStats(actionsArray);
          }
        });

        if (hasStats) {
          userStats.combined.shards = handleCombinedRoomStats(userStats.shards);
          stats[username] = { stats: userStats };
        }
      });

      const shards = Object.keys(this._users[username]);
      for (let s = 0; s < shards.length; s += 1) {
        const shard = shards[s];
        const rooms = this._users[username][shard];

        const roomNames = Object.keys(rooms);
        this.AddRooms(username, shard, roomNames, true);
      }
    });

    this.Upload({ users: stats, shardTicks }, timestamp, {
      start,
      type: "Users",
    });
  }

  static Upload(data, timestamp, logInfo) {
    const _timestamp = timestamp || Date.now();

    if (process.env.GRAPHITE_ONLINE === "FALSE") return;
    client.write(
      { screeps: { userTracker: { [process.env.SERVER_TYPE]: data } } },
      _timestamp,
      (err) => {
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
      }
    );
  }
}
