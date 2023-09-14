import BaseDataBroker from "../base.js";
import ReservedDataBroker from "./reserved.js";
import {
  GetUsernames,
  GetUserData,
  GetRoomTotal,
} from "../../../rooms/userHelper.js";
import {
  handleCombinedRoomStats,
} from "../../handle/helper.js";
import ProcessDataBroker from "../processData.js";

export default class OwnedDataBroker extends BaseDataBroker {
  static Type = "owned";
  static Stats = {};

  static AddRoomData(username, shard, roomName, data) {
    super.AddRoomData(username, shard, roomName, data);
  }

  static async UploadUsers(username) {
    const start = Date.now();
    let timestamp;
    const historyTicks = {};

    const stats = {};
    function getStatsObject() {
      return {
        shards: {},
        combined: {
          shards: {},
        },
      };
    }

    const tickRates = ProcessDataBroker.tickRates;
    const userStats = getStatsObject();
    for (const shardName in this._users[username]) {
      if (Object.hasOwnProperty.call(this._users[username], shardName)) {
        const shards = this._users[username][shardName];
        for (const roomName in shards) {
          if (Object.hasOwnProperty.call(shards, roomName)) {
            const roomData = shards[roomName].shift();
            userStats.shards[roomName] = roomData.stats;

            if (!historyTicks[shardName]) historyTicks[shardName] = roomData.tick;
          }
        }
      }
    }

    userStats.combined.shards = handleCombinedRoomStats(
      userStats.shards,
      this.Type
    );
    if (process.env.ONLY_COMBINED_DATA_UPLOAD === "true") delete userStats.shards;
    stats[username] = { stats: userStats };

    await super.Upload(
      { users: stats, ticks: { history: historyTicks, tickRates } },
      timestamp,
      {
        start,
        type: this.Type,
      }
    );
  }

  static getRoomsToCheck(roomsPerCycle, types, addReservedRooms) {
    const usernames = GetUsernames();
    let userCount = 0;
    let roomCount = 0;

    usernames.forEach((username) => {
      const userData = GetUserData(username);

      userData.total = !addReservedRooms ? GetRoomTotal(userData.shards, this.Type) : GetRoomTotal(userData.shards, "total");
      if (userData.total + roomCount <= roomsPerCycle) {
        userCount += 1;
        roomCount += userData.total;

        if (!types[this.Type]) types[this.Type] = {};
        const shardRooms = types[this.Type];

        Object.entries(userData.shards).forEach(([shard, data]) => {
          if (!shardRooms[shard]) {
            shardRooms[shard] = [];
          }
          shardRooms[shard].push(...data.owned);
          this.AddRooms(username, shard, data.owned);
        });

        if (addReservedRooms) ReservedDataBroker.getRoomsToCheckByUsername(username, types, userData);
      }
    });

    return { userCount, roomCount };
  }
}

const DEBUG = process.env.DEBUG === "TRUE";
const checkUsersJob = new CronJob(
  DEBUG ? "* * * * *" : "*/10 * * * *",
  OwnedDataBroker.CheckUsers,
  null,
  false,
  "Europe/Amsterdam"
);
checkUsersJob.start();