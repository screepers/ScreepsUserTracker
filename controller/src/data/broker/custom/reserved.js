import BaseDataBroker from "../base.js";
import {
  GetUsernames,
  GetUserData,
  GetRoomTotal,
} from "../../../rooms/userHelper.js";
import { handleCombinedRoomStats } from "../../handle/helper.js";
import DataRequestsBroker from "../requests.js";

export default class ReservedDataBroker extends BaseDataBroker {
  static Type = "reserved";

  static AddRoomData(username, shard, roomName, data) {
    super.AddRoomData(username, shard, roomName, data);
  }

  static async UploadStatus() {
    const start = Date.now();

    await super.Upload(
      {
        status: { [this.Type]: DataRequestsBroker.getStatusObject(this.Type) },
      },
      undefined,
      {
        start,
        type: `${this.Type}Status`,
      }
    );
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

    const userStats = getStatsObject();
    const shardNames = Object.keys(this.users[username]);
    for (let i = 0; i < shardNames.length; i += 1) {
      const shardName = shardNames[i];
      const shardData = this.users[username][shardName];
      const roomNames = Object.keys(shardData);

      userStats.shards[shardName] = {};
      for (let j = 0; j < roomNames.length; j += 1) {
        const roomName = roomNames[j];
        const roomData = shardData[roomName];
        userStats.shards[shardName][roomName] = roomData.stats;

        if (!historyTicks[shardName]) historyTicks[shardName] = roomData.tick;
        if (!timestamp) timestamp = roomData.timestamp;
      }
    }

    userStats.combined.shards = handleCombinedRoomStats(
      userStats.shards,
      this.Type
    );
    stats[username] = { stats: userStats };

    await super.Upload(
      {
        users: stats,
        ticks: {
          history: historyTicks,
          tickRates: BaseDataBroker.tickRates,
        },
      },
      timestamp,
      {
        start,
        type: this.Type,
      }
    );
  }

  static getRoomsToCheckByUsername(username, types, userData) {
    if (!types[this.Type]) types[this.Type] = {};
    const shardRooms = types[this.Type];

    Object.entries(userData.shards).forEach(([shard, data]) => {
      if (!shardRooms[shard]) {
        shardRooms[shard] = [];
      }
      shardRooms[shard].push(...data.reserved);
      this.AddRooms(username, shard, data.reserved);
    });
  }

  static getRoomsToCheck(roomsPerCycle, types) {
    const usernames = GetUsernames();
    let userCount = 0;
    let roomCount = 0;

    usernames.forEach((username) => {
      const userData = GetUserData(username);

      userData.total = GetRoomTotal(userData.shards, this.Type);
      if (userData.total + roomCount <= roomsPerCycle) {
        userCount += 1;
        roomCount += userData.total;
        ReservedDataBroker.getRoomsToCheckByUsername(username, types, userData);
      }
    });

    return { userCount, roomCount };
  }
}
