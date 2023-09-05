import BaseDataBroker from "../base.js";
import {
  GetUsernames,
  GetUserData,
  GetRoomTotal,
} from "../../../rooms/userHelper.js";
import handleObjects from "../../handle/custom/reservedRoom.js";
import {
  getStats,
  handleCombinedRoomStats,
  FindNewDefaultActions,
} from "../../handle/helper.js";

export default class ReservedDataBroker extends BaseDataBroker {
  static Type = "reserved";

  static async UploadStatus(ipStatus) {
    const start = Date.now();

    await super.Upload(
      {
        status: { [this.Type]: ipStatus },
      },
      undefined,
      {
        start,
        type: `${this.Type}Status`,
      }
    );
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
    let hasStatsGlobally = false;

    const historyTicks = {};
    const tickRates = {};
    usernames.forEach((username) => {
      const userStats = getStatsObject();
      Object.values(this._users[username]).forEach((shardData) => {
        let hasStats = false;

        Object.values(shardData).forEach((roomData) => {
          const { dataResult, dataRequest } = roomData;
          if (dataResult) {
            hasStats = true;
            hasStatsGlobally = true;

            let actionsArray = [];
            const { ticks } = dataResult;
            const tickKeys = Object.keys(ticks);

            const originalObjects = Object.values(ticks).filter(
              (tl) => tl !== null
            )[0];

            tickKeys.forEach((tick, index) => {
              if (ticks[tick]) {
                actionsArray = actionsArray.concat(
                  handleObjects(username, ticks[tick], {
                    previousObjects: ticks[tickKeys[index - 1]],
                    originalObjects,
                    ticks,
                    tick,
                    type: this.Type,
                    isFirstTick: index === 0,
                  })
                );
              }
            });

            FindNewDefaultActions(actionsArray, this.Type);

            if (!userStats.shards[dataRequest.shard]) {
              userStats.shards[dataRequest.shard] = {};
            }
            userStats.shards[dataRequest.shard][dataRequest.room] =
              getStats(actionsArray);
          }
        });

        if (hasStats) {
          userStats.combined.shards = handleCombinedRoomStats(
            userStats.shards,
            this.Type
          );
          stats[username] = { stats: userStats };
        }
      });

      const shards = Object.keys(this._users[username]);
      shards.forEach((shard) => {
        const rooms = this._users[username][shard];

        const roomNames = Object.keys(rooms);
        this.AddRooms(username, shard, roomNames, true);
      });
    });

    if (hasStatsGlobally) {
      await super.Upload(
        { users: stats, ticks: { history: historyTicks, tickRates } },
        timestamp,
        {
          start,
          type: this.Type,
        }
      );
    }
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
