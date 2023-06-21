import BaseDataBroker from "./base.js";
import {
  GetUsernames,
  GetUserData,
  GetRoomTotal,
} from "../../rooms/userHelper.js";
import handleObjects from "../handle/objects.js";
import handleUsers from "../handle/users.js";
import { GetGameTime } from "../screepsApi.js";
import { getStats, handleCombinedRoomStats } from "../handle/helper.js";

export default class MainDataBroker extends BaseDataBroker {
  static Type = "main";

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

    BaseDataBroker.Upload(
      {
        status: { [MainDataBroker.Type]: ipStatus },
        ticks: {
          live: liveTicks,
        },
        users: stats,
      },
      undefined,
      {
        start,
        type: `${MainDataBroker.Type}Status`,
      }
    );
  }

  async UploadUsers(usernames) {
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

            if (!timestamp) {
              timestamp = dataResult.timestamp;
            }
            if (!historyTicks[dataRequest.shard]) {
              historyTicks[dataRequest.shard] = dataRequest.tick;

              tickRates[dataRequest.shard] = this._lastTickTimestamp[
                dataRequest.shard
              ]
                ? Math.round(
                    (dataResult.timestamp -
                      this._lastTickTimestamp[dataRequest.shard]) /
                      100
                  )
                : 0;

              this._lastTickTimestamp[dataRequest.shard] = dataResult.timestamp;
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
                    type: MainDataBroker.Type,
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
          userStats.combined.shards = handleCombinedRoomStats(userStats.shards, MainDataBroker.Type);
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

    BaseDataBroker.Upload(
      { users: stats, ticks: { history: historyTicks, tickRates } },
      timestamp,
      {
        start,
        type: MainDataBroker.Type,
      }
    );
  }

  getRoomsToCheck(roomsPerCycle) {
    const usernames = GetUsernames();
    const types = {};
    let userCount = 0;
    let roomCount = 0;

    for (let i = 0; i < usernames.length; i += 1) {
      const username = usernames[i];
      const userData = GetUserData(username);

      userData.total = GetRoomTotal(userData.shards);
      if (userData.total + roomCount <= roomsPerCycle) {
        userCount += 1;
        roomCount += userData.total;

        if (!types[MainDataBroker.Type]) types[MainDataBroker.Type] = {};
        const shardRooms = types[MainDataBroker.Type];

        Object.entries(userData.shards).forEach(([shard, data]) => {
          if (!shardRooms[shard]) {
            shardRooms[shard] = [];
          }
          shardRooms[shard].push(...data.owned);
          this.AddRooms(username, shard, data.owned);
        });
      } else break;
    }

    return { types, userCount, roomCount };
  }
}
