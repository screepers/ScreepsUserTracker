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
  static requests;

  static roomsBeingChecked;

  static lastTickTimes = {};

  static knownTickTimes = {};

  static async constructorAsync() {
    this.requests = this.getRequests();
    this.roomsBeingChecked = this.getRoomsBeingChecked();
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

  static saveRoomsBeingChecked(rooms) {
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

  static saveRequests() {
    fs.mkdirSync(requestsFolderPath, { recursive: true });

    const noDuplicatedRequests = [];
    const noDuplicatedRequestsAggregator = {};

    this.requests.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.shard !== b.shard) return a.shard - b.shard;
      if (a.room !== b.room) return a.room.localeCompare(b.room);
      return a.type.localeCompare(b.type);
    });

    this.requests.forEach((r) => {
      if (!noDuplicatedRequestsAggregator[r.type])
        noDuplicatedRequestsAggregator[r.type] = {};
      if (!noDuplicatedRequestsAggregator[r.type][r.tick])
        noDuplicatedRequestsAggregator[r.type][r.tick] = {};
      if (!noDuplicatedRequestsAggregator[r.type][r.tick][r.shard])
        noDuplicatedRequestsAggregator[r.type][r.tick][r.shard] = {};
      noDuplicatedRequestsAggregator[r.type][r.tick][r.shard][r.room] = null;
    });

    Object.keys(noDuplicatedRequestsAggregator).forEach((type) => {
      Object.keys(noDuplicatedRequestsAggregator[type]).forEach((tick) => {
        Object.keys(noDuplicatedRequestsAggregator[type][tick]).forEach(
          (shard) => {
            Object.keys(
              noDuplicatedRequestsAggregator[type][tick][shard]
            ).forEach((room) => {
              noDuplicatedRequests.push({
                type,
                tick,
                shard,
                room,
              });
            });
          }
        );
      });
    });

    fs.writeFileSync(requestsPath, JSON.stringify(this.requests));
    this.requests = noDuplicatedRequests;
  }

  static getFirstRequest() {
    return this.requests.shift();
  }

  static async getCurrentTick(type, shard) {
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

  static async syncRequests() {
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
