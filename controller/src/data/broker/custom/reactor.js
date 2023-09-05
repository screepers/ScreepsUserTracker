import {
  GetUsernameById,
  GetReactorRoomNames,
} from "../../../rooms/userHelper.js";
import BaseDataBroker from "../base.js";
import handleObjects from "../../handle/custom/reactorRoom.js";
import {
  getStats,
  handleCombinedRoomStats,
  FindNewDefaultActions,
} from "../../handle/helper.js";

export default class ReactorDataBroker extends BaseDataBroker {
  static Type = "reactor";

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
              (
                Object.values(currentObjects).find(
                  (o) =>
                    o.type === "reactor" &&
                    o.user &&
                    o.store.T > 0 &&
                    o.launchTime
                ) || {}
              ).user
            );
            if (username) {
              tickKeys.forEach((tick, index) => {
                if (ticks[tick]) {
                  actionsArray = actionsArray.concat(
                    handleObjects(ticks[tick], {
                      previousObjects: ticks[tickKeys[index - 1]],
                      currentObjects,
                      ticks,
                      tick,
                      type: this.Type,
                      isFirstTick: index === 0,
                    })
                  );
                }
              });

              if (!usersStats[username])
                usersStats[username] = getStatsObject();
              const userStats = usersStats[username];
              if (!userStats.shards[dataRequest.shard]) {
                userStats.shards[dataRequest.shard] = {};
              }
              userStats.shards[dataRequest.shard][dataRequest.room] =
                getStats(actionsArray);
            }

            FindNewDefaultActions(actionsArray, this.Type);
          }
        });

        if (hasStats) {
          Object.keys(usersStats).forEach((username) => {
            const userStats = usersStats[username];
            userStats.combined.shards = handleCombinedRoomStats(
              userStats.shards,
              this.Type
            );
            stats[username] = { stats: userStats };
          });
        }
      });

      const shards = Object.keys(this._users[oriUsername]);
      shards.forEach((shard) => {
        const rooms = this._users[oriUsername][shard];

        const roomNames = Object.keys(rooms);
        this.AddRooms(oriUsername, shard, roomNames, true);
      });
    });

    if (hasStatsGlobally) {
      await super.Upload({ users: stats }, timestamp, {
        start,
        type: this.Type,
      });
    }
  }

  static async getRoomsToCheck(roomsPerCycle, roomCount, types) {
    let _roomCount = roomCount;
    for (let s = 0; s < this._shards.length; s += 1) {
      const shard = this._shards[s];
      const reactorRooms = await GetReactorRoomNames(shard);

      if (reactorRooms.length + roomCount <= roomsPerCycle) {
        _roomCount += reactorRooms.length;

        if (!types[this.Type]) types[this.Type] = {};
        if (!types[this.Type][shard]) {
          types[this.Type][shard] = reactorRooms;
        }
        this.AddRooms(this.Type, shard, reactorRooms);
      }
    }

    return _roomCount;
  }
}
