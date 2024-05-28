import handleOwnedObjects from "../converter/manage/ownedRoom.js";
import handleReservedObjects from "../converter/manage/reservedRoom.js";
import handleUnknownObjects from "../converter/manage/unknownRoom.js";

import prepareObject from "../converter/prepare/object.js";
import { summarizeObjects } from "../converter/helper.js";

import { cleanSource } from "../../helper/index.js";
import ActionProcessor from "./defaultActions.js"

export default class ProcessDataBroker {
  static lastTickTimestamp = {};

  static lastTickTicks = {};

  static tickRates = {};

  static usernamesById = {};

  static setTickRate(roomData, opts) {
    const tick = Number(opts.tick);
    const newTimestamp = this.lastTickTimestamp[
      opts.shard
    ] && this.lastTickTimestamp[
    opts.shard
    ] < roomData.timestamp;
    const newTick = this.lastTickTicks[opts.shard] && this.lastTickTicks[opts.shard] < tick;
    if (newTimestamp && newTick) {
      const tickRate = (roomData.timestamp - this.lastTickTimestamp[opts.shard]) /
        100;
      this.tickRates[opts.shard] = Math.round(tickRate);
    }

    this.lastTickTimestamp[opts.shard] = roomData.timestamp;
    this.lastTickTicks[opts.shard] = tick;
  }

  static async prepareObjects(ticks, opts) {
    const uniqueObjects = {};
    const data = {
      ticks: {}
    }

    const tickKeys = Object.keys(ticks);
    const firstTickObjects = Object.entries(ticks[tickKeys[0]] || {});

    for (let t = 0; t < tickKeys.length; t += 1) {
      const tick = tickKeys[t];
      data.ticks[tick] = {
        objects: {}
      }
    }

    for (let o = 0; o < firstTickObjects.length; o += 1) {
      const id = firstTickObjects[o][0];
      const firstTickObject = firstTickObjects[o][1];
      if (opts.userId === firstTickObject.user || opts.type === "unknown") {
        const uniqueObject = cleanSource(firstTickObject);
        uniqueObjects[id] = uniqueObject;

        for (let t = 0; t < tickKeys.length; t += 1) {
          const tick = tickKeys[t];
          let object = ticks[tick] ? ticks[tick][id] : null;
          if (!object) object = {
            type: uniqueObject.type,
          }
          await prepareObject(object, uniqueObject);
          data.ticks[tick].objects[id] = object;
        }
      }
    }

    for (let t = 0; t < 100; t += 1) {
      const tick = tickKeys[t];
      if (tick) data.ticks[tick].summarize = summarizeObjects(data.ticks[tick].objects);
    }

    data.uniqueObjects = uniqueObjects
    return data
  }

  static async getType(roomData, opts) {
    const { ticks } = await this.prepareObjects(roomData.ticks, opts);
    const tickKeys = Object.keys(ticks);

    const users = {};
    for (let t = 0; t < tickKeys.length; t += 1) {
      const tick = tickKeys[t];
      if (ticks[tick]) {
        const { summarize } = ticks[tick];
        const { controller, creeps, structures } = summarize;
        if (controller && controller.level > 0) {
          opts.userId = controller.user;
          opts.username = this.usernamesById[opts.userId];
          if (!opts.username) return ""
          return "owned";
        }
        if (controller && controller.reservation) {
          opts.userId = controller.reservation.user;
          opts.username = this.usernamesById[opts.userId];
          if (!opts.username) return ""
          return "reserved";
        }

        for (let c = 0; c < creeps.length; c += 1) {
          const creep = creeps[c];
          if (creep.user) users[creep.user] = (users[creep.user] || 0) + 1
        }
        for (let s = 0; s < structures.length; s += 1) {
          const structure = structures[s];
          if (structure.user) users[structure.user] = (users[structure.user] || 0) + 1
        }
      }
    }

    const userKeys = Object.keys(users);
    if (userKeys.length === 0) return "";
    const user = userKeys.reduce((a, b) => users[a] > users[b] ? a : b);
    opts.userId = user;
    opts.username = this.usernamesById[opts.userId];
    if (!opts.username) return ""
    return "unknown";
  }

  static async single(data) {
    try {
      const { opts, roomData } = data
      if (opts.type === "unknown") opts.type = await this.getType(roomData, opts);
      if (!opts.type) return null;

      this.setTickRate(roomData, opts);

      const { ticks, uniqueObjects } = await this.prepareObjects(roomData.ticks, opts);
      opts.uniqueObjects = uniqueObjects

      let handleObjects = null;
      switch (opts.type) {
        case "owned":
          handleObjects = handleOwnedObjects;
          break;
        case "reserved":
          handleObjects = handleReservedObjects;
          break;
        case "unknown":
        default:
          handleObjects = handleUnknownObjects;
          break;
      }

      let actionsArray = [];
      const tickKeys = Object.keys(ticks);
      for (let t = 0; t < tickKeys.length; t += 1) {
        const tick = tickKeys[t];
        opts.isFirstTick = t === 0
        if (ticks[tick]) {
          opts.currentTick = tick;
          actionsArray = actionsArray.concat(
            await handleObjects(ticks[tick], opts)
          );
        }
      }


      if (process.env.CHECK_FOR_NEW_ACTIONS === "TRUE")
        ActionProcessor.FindNewDefaultActions(actionsArray, opts.type);

      return ActionProcessor.getStats(actionsArray);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
