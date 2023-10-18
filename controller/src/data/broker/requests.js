import 'dotenv/config';
import fs from "fs";
import GetGameTime from "../screepsApi.js";

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

  static roomsBeingChecked = {};

  static lastRequestAddedTick = {};

  static lastLiveTick = {};

  static lastRequestRemoved = {}

  static async constructorAsync() {
    this.roomsBeingChecked = this.getRoomsBeingChecked();
    this.requests = this.getRequests();
    for (let dt = 0; dt < dataTypes.length; dt += 1) {
      const dataType = dataTypes[dt];
      this.lastRequestAddedTick[dataType] = {};
      for (let s = 0; s < shards.length; s += 1) {
        const shard = shards[s];
        this.lastRequestAddedTick[dataType][shard] =
          process.env.START_FROM_TICK ? Number(process.env.START_FROM_TICK) : await GetGameTime(shard);
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
    fs.writeFileSync(roomsCheckedPath, JSON.stringify(rooms, null, 2));

    this.roomsBeingChecked = rooms;
    this.syncRequests();
    this.saveRequests();
  }

  static getRequests() {
    if (fs.existsSync(requestsPath)) {
      return JSON.parse(fs.readFileSync(requestsPath));
    }
    return [];
  }

  static getRequestsByType(type) {
    return this.requests.filter((r) => r.type === type);
  }

  static getStatusObject(type) {
    return {
      requestCount: this.getRequestsByType(type).length,
      roomsBeingChecked: this.roomsBeingChecked[type],
      lastLiveTick: this.lastLiveTick,
      lastRequestAddedTick: this.lastRequestAddedTick[type],
      lastRequestRemoved: this.lastRequestRemoved[type]
    }
  }

  static saveRequests() {
    fs.mkdirSync(requestsFolderPath, { recursive: true });

    const noDuplicatedRequests = [];
    const noDuplicatedRequestsAggregator = {};

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
    this.requests = noDuplicatedRequests;

    this.requests.sort((a, b) => {
      a.tick = Number(a.tick);
      b.tick = Number(b.tick);

      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (a.shard !== b.shard) return a.shard - b.shard;
      if (a.room !== b.room) return a.room.localeCompare(b.room);
      return 0; // If all properties are the same, return 0 to maintain their relative order.
    });
    fs.writeFileSync(requestsPath, JSON.stringify(this.requests, null, 2));
  }

  static getRequest() {
    const request = this.requests.shift()
    if (request) {
      if (!this.lastRequestRemoved[request.type]) this.lastRequestRemoved[request.type] = {}
      this.lastRequestRemoved[request.type][request.shard] = request.tick
    }
    return request;
  }

  static async getCurrentTick(type, shard) {
    const time = Date.now();
    if (this.lastLiveTick[shard]) {
      const knownTick = this.lastLiveTick[shard];
      if (time - knownTick.time < 60 * 1000) return knownTick.data;
    }

    await wait(500);
    const tick = await GetGameTime(shard);
    if (tick) {
      this.lastLiveTick[shard] = { data: tick, time };
      return tick;
    }

    return this.lastRequestAddedTick[type][shard] || 0;
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
          this.lastLiveTick
        );
        let requestTick = Math.max(currentTick - (currentTick % 100) - 200, 0);

        const rooms = this.roomsBeingChecked[type][shard];
        if (rooms && rooms.length > 0) {
          if (
            this.lastRequestAddedTick[type][shard] !== undefined &&
            requestTick - 100 > this.lastRequestAddedTick[type][shard]
          ) {
            requestTick = this.lastRequestAddedTick[type][shard] + 100;
          }

          if (this.lastRequestAddedTick[type][shard] !== requestTick) {
            for (let r = 0; r < rooms.length; r += 1) {
              const room = rooms[r];
              const dataRequest = {
                room,
                shard,
                tick: requestTick,
                type,
              };
              this.requests.push(dataRequest);
            };
            this.lastRequestAddedTick[type][shard] = requestTick;
            addedRequests = true;
          }
        }
      }
    }

    if (addedRequests && this.requests.length < 100 * 1000) {
      this.syncRequests();
    }
  }
}
