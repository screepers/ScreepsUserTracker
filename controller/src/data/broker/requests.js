import * as dotenv from "dotenv";
import fs from "fs";
import { GetGameTime } from "../screepsApi.js";

dotenv.config();

const shards = process.env.SHARDS.split(" ");
const dataTypes = process.env.DATA_TYPES.split(" ");
const roomsCheckedFolderPath = "./files";
const roomsCheckedPath = `${roomsCheckedFolderPath}/roomsBeingChecked.json`;
const requestsFolderPath = "./files";
const requestsPath = `${roomsCheckedFolderPath}/requests.json`;

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class DataRequestsBroker {
  requests;

  roomsBeingChecked;

  lastTickTimes = {};

  knownTickTimes = {};

  async constructorAsync() {
    this.requests = DataRequestsBroker.getRequests();
    this.roomsBeingChecked = DataRequestsBroker.getRoomsBeingChecked();
    for (let dt = 0; dt < dataTypes.length; dt += 1) {
      const dataType = dataTypes[dt];
      this.lastTickTimes[dataType] = {};
      for (let s = 0; s < shards.length; s += 1) {
        const shard = shards[s];
        this.lastTickTimes[dataType][shard] =
          Number(process.env[`START_FROM_TICK_${dataType.toUpperCase()}`]) ||
          (await GetGameTime(shard));
      }
    }

    this.syncRequests();
  }

  static getRoomsBeingChecked() {
    if (fs.existsSync(roomsCheckedPath)) {
      return JSON.parse(fs.readFileSync(roomsCheckedPath));
    }
    return {};
  }

  saveRoomsBeingChecked(rooms) {
    fs.mkdirSync(roomsCheckedFolderPath, { recursive: true });
    fs.writeFileSync(roomsCheckedPath, JSON.stringify(rooms));

    this.roomsBeingChecked = rooms;
    this.saveRequests();
    this.syncRequests();
  }

  static getRequests() {
    if (fs.existsSync(requestsPath)) {
      return JSON.parse(fs.readFileSync(requestsPath));
    }
    return [];
  }

  saveRequests() {
    fs.mkdirSync(requestsFolderPath, { recursive: true });
    fs.writeFileSync(requestsPath, JSON.stringify(this.requests));
  }

  getRequestsToSend(count) {
    const requestsToSend = [];
    for (let i = 0; i < count; i += 1) {
      const request = this.requests.shift();
      if (!request) break;
      requestsToSend.push(request);
    }

    return requestsToSend;
  }

  async getCurrentTick(type, shard) {
    const time = Date.now();
    if (this.knownTickTimes[shard]) {
      const knownTick = this.knownTickTimes[shard];
      if (time - knownTick.time < 60 * 1000) return knownTick.data;
    }

    await wait(500);
    const tick = await GetGameTime(shard);
    if (tick) {
      this.knownTickTimes[shard] = { data: tick, time };
      return tick;
    }

    return this.lastTickTimes[type][shard] || 0;
  }

  async syncRequests() {
    let addedRequests = false;
    for (let i = 0; i < shards.length; i += 1) {
      const shard = shards[i];

      const types = Object.keys(this.roomsBeingChecked);
      for (let t = 0; t < types.length; t += 1) {
        const type = types[t];
        const currentTick = await this.getCurrentTick(
          type,
          shard,
          this.knownTickTimes
        );
        let requestTick = Math.max(currentTick - (currentTick % 100) - 1000, 0);

        const rooms = this.roomsBeingChecked[type][shard];
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
              this.requests.push(dataRequest);
            });
            this.lastTickTimes[type][shard] = requestTick;
            addedRequests = true;
          }
        }
      }
    }

    if (addedRequests) {
      this.syncRequests();
    }
  }
}