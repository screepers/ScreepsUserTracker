import {
  GetUsernameById,
  GetReactorRoomNames,
} from "../../rooms/userHelper.js";
import BaseDataBroker from "./base.js";
import handleObjects from "../handle/custom/reactorRoom.js";
import { getStats, handleCombinedRoomStats } from "../handle/helper.js";

export default class ReactorDataBroker extends BaseDataBroker {
  static Type = "reactor";

  static async UploadStatus(ipStatus) {
    const start = Date.now();

    BaseDataBroker.Upload(
      {
        status: { [ReactorDataBroker.Type]: ipStatus },
      },
      undefined,
      {
        start,
        type: `${ReactorDataBroker.Type}Status`,
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

    const usersStats = {};
    let hasStatsGlobally = false;

    usernames.forEach((oriUsername) => {
      Object.values(this._users[oriUsername]).forEach((shardData) => {
        let hasStats = false;

        Object.values(shardData).forEach((roomData) => {
          const { dataResult, dataRequest } = roomData;
          if (dataResult) {
            hasStats = true;
            hasStatsGlobally = true;

            if (!timestamp) {
              timestamp = dataResult.timestamp;
            }

            let actionsArray = [];
            const { ticks } = dataResult;
            const tickKeys = Object.keys(ticks);

            const currentObjects = Object.values(ticks).filter(
              (tl) => tl !== null
            )[0];

            const username = GetUsernameById(
              (Object.values(currentObjects).find((o) => o.user) || {}).user
            );
            if (username) {
              for (let t = 0; t < tickKeys.length; t += 1) {
                const tick = tickKeys[t];
                if (ticks[tick]) {
                  actionsArray = actionsArray.concat(
                    handleObjects(ticks[tick], {
                      previousObjects: ticks[tickKeys[t - 1]],
                      currentObjects,
                      ticks,
                      tick,
                      type: ReactorDataBroker.Type,
                    })
                  );
                }
              }

              if (!usersStats[username])
                usersStats[username] = getStatsObject();
              const userStats = usersStats[username];
              if (!userStats.shards[dataRequest.shard]) {
                userStats.shards[dataRequest.shard] = {};
              }
              userStats.shards[dataRequest.shard][dataRequest.room] =
                getStats(actionsArray);
            }
          }
        });

        if (hasStats) {
          Object.keys(usersStats).forEach((username) => {
            const userStats = usersStats[username];
            userStats.combined.shards = handleCombinedRoomStats(
              userStats.shards,
              ReactorDataBroker.Type
            );
            stats[username] = { stats: userStats };
          });
        }
      });

      const shards = Object.keys(this._users[oriUsername]);
      for (let s = 0; s < shards.length; s += 1) {
        const shard = shards[s];
        const rooms = this._users[oriUsername][shard];

        const roomNames = Object.keys(rooms);
        this.AddRooms(oriUsername, shard, roomNames, true);
      }
    });

    if (hasStatsGlobally) {
      BaseDataBroker.Upload({ users: stats }, timestamp, {
        start,
        type: ReactorDataBroker.Type,
      });
    }
  }

  async getRoomsToCheck(roomsPerCycle, roomCount, types) {
    let _roomCount = roomCount;
    for (let s = 0; s < this._shards.length; s += 1) {
      const shard = this._shards[s];
      const reactorRooms = await GetReactorRoomNames(shard);

      if (reactorRooms.length + roomCount <= roomsPerCycle) {
        _roomCount += reactorRooms.length;

        if (!types[ReactorDataBroker.Type]) types[ReactorDataBroker.Type] = {};
        if (!types[ReactorDataBroker.Type][shard]) {
          types[ReactorDataBroker.Type][shard] = reactorRooms;
        }
        this.AddRooms("reactor", shard, reactorRooms);
      }
    }

    return _roomCount;
  }
}