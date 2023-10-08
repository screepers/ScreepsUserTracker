import BaseDataBroker from "../base.js";
// eslint-disable-next-line import/no-cycle
import ReservedDataBroker from "./reserved.js";
import {
  GetUsernames,
  GetUserData,
  GetRoomTotal,
} from "../../../rooms/userHelper.js";
import { handleCombinedRoomStats } from "../../handle/helper.js";
import DataRequestsBroker from "../requests.js";

export default class OwnedDataBroker extends BaseDataBroker {
  static Type = "owned";

  static Stats = {};

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
        if (roomData) {
          userStats.shards[shardName][roomName] = roomData.stats;
          if (!historyTicks[shardName]) historyTicks[shardName] = roomData.tick;
          if (!timestamp) timestamp = roomData.timestamp;
        }
      }
    }

    userStats.combined.shards = handleCombinedRoomStats(
      userStats.shards,
      this.Type
    );
    if (process.env.ONLY_COMBINED_DATA_UPLOAD === "true")
      delete userStats.shards;
    stats[username] = { stats: userStats };

    for (let i = 0; i < shardNames.length; i += 1) {
      const shardName = shardNames[i];
      const rooms = this.users[username][shardName];

      const roomNames = Object.keys(rooms);
      this.AddRooms(username, shardName, roomNames, true);
    };

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

  static getRoomsToCheck(roomsPerCycle, types, addReservedRooms) {
    const usernames = GetUsernames();
    let userCount = 0;
    let roomCount = 0;

    for (let u = 0; u < usernames.length; u += 1) {
      const username = usernames[u];
      const userData = GetUserData(username);

      userData.total = !addReservedRooms
        ? GetRoomTotal(userData.shards, this.Type)
        : GetRoomTotal(userData.shards, "total");
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
          if (addReservedRooms) this.AddRooms(username, shard, [...data.owned, ...data.reserved])
        });

        if (addReservedRooms)
          ReservedDataBroker.getRoomsToCheckByUsername(
            username,
            types,
            userData,
            true
          );
      }
    };

    return { userCount, roomCount };
  }
}
