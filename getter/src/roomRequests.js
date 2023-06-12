import * as dotenv from "dotenv";
import { GetGameTime } from "./screepsApi.js";

dotenv.config();

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class RoomRequests {
  lastTickTimes = {};

  shards = process.env.SHARDS.split(" ");

  rooms = {};

  DataRequestBroker = null;

  constructor(rooms, DataRequestBroker) {
    this.rooms = rooms;
    this.DataRequestBroker = DataRequestBroker;

    if (process.env.START_FROM_TICK) {
      this.shards.forEach((shard) => {
        this.lastTickTimes[shard] = Number(process.env.START_FROM_TICK) - 100;
      });
    }
  }

  forceUpdateRooms(rooms) {
    this.rooms = rooms;
  }

  getRooms() {
    return this.rooms;
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

      const rooms = this.rooms[shard];
      if (rooms && rooms.length > 0) {
        if (
          this.lastTickTimes[shard] !== undefined &&
          requestTick - 100 > this.lastTickTimes[shard]
        ) {
          requestTick = this.lastTickTimes[shard] + 100;
        }

        if (this.lastTickTimes[shard] !== requestTick) {
          rooms.forEach((room) => {
            const dataRequest = {
              room,
              shard,
              tick: requestTick,
            };
            dataRequests.push(dataRequest);
          });
          this.DataRequestBroker.addDataRequests(dataRequests);
          this.lastTickTimes[shard] = requestTick;
        }
      }
    }
    await wait(1000 * 10);
    this.sync();
  }
}
