import * as dotenv from "dotenv";
import { GetGameTime } from "./screepsApi.js";

dotenv.config();

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class RoomRequests {
  lastTickTimes = { main: {} };

  shards = process.env.SHARDS.split(" ");

  rooms = {};

  DataRequestBroker = null;

  constructor(DataRequestBroker) {
    this.DataRequestBroker = DataRequestBroker;

    if (process.env.START_FROM_TICK_MAIN) {
      this.shards.forEach((shard) => {
        this.lastTickTimes.main[shard] =
          Number(process.env.START_FROM_TICK_MAIN) - 100;
      });
    }
    if (process.env.START_FROM_TICK_REACTOR) {
      if (!this.lastTickTimes.reactor) this.lastTickTimes.reactor = {};
      this.shards.forEach((shard) => {
        this.lastTickTimes.reactor[shard] =
          Number(process.env.START_FROM_TICK_REACTOR) - 100;
      });
    }
  }

  forceUpdateRooms(rooms, type) {
    this.rooms[type] = rooms;
  }

  getRooms(type) {
    return this.rooms[type] || [];
  }

  async getCurrentTick(shard) {
    const tick = await GetGameTime(shard);
    if (tick) {
      return tick;
    }

    return this.lastTickTimes[shard] || 0;
  }

  async sync() {
    for (let i = 0; i < this.shards.length; i += 1) {
      const shard = this.shards[i];

      const dataRequests = [];
      const currentTick = await this.getCurrentTick(shard);
      let requestTick = Math.max(currentTick - (currentTick % 100) - 1000, 0);

      const types = Object.keys(this.rooms);
      types.forEach((type) => {
        const rooms = this.rooms[type][shard];
        if (rooms && rooms.length > 0) {
          if (
            this.lastTickTimes[type][shard] !== undefined &&
            requestTick - 100 > this.lastTickTimes[type][shard]
          ) {
            requestTick = this.lastTickTimes[type][shard] + 100;
          }

          if (this.lastTickTimes[type][shard] !== requestTick) {
            rooms.forEach((room) => {
              const dataRequest = {
                room,
                shard,
                tick: requestTick,
                type,
              };
              dataRequests.push(dataRequest);
            });
            this.DataRequestBroker.addDataRequests(dataRequests);
            this.lastTickTimes[type][shard] = requestTick;
          }
        }
      });
    }
    await wait(1000 * 10);
    this.sync();
  }
}
