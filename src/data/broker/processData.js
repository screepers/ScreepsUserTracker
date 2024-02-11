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
    const firstTickObjectsPromises = firstTickObjects.map(async ([id, firstTickObject]) => {
      if (opts.userId === firstTickObject.user) {
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
    })
    await Promise.all(firstTickObjectsPromises);

    const summarizeObjectPromises = Array.from({ length: 100 }, (_, t) => {
      const tick = tickKeys[t];
      if (tick) data.ticks[tick].summarize = summarizeObjects(data.ticks[tick].objects);
      return Promise.resolve();
    });
    await Promise.all(summarizeObjectPromises);

    data.uniqueObjects = uniqueObjects
    return data
  }

  static async single(data) {
    try {
      const { opts, roomData } = data
      this.setTickRate(roomData, opts);

      let handleObjects = null;
      switch (opts.type) {
        case "owned":
          handleObjects = handleOwnedObjects;
          break;
        case "reserved":
          handleObjects = handleReservedObjects;
          break;
        case "unknown":
          handleObjects = handleUnknownObjects;
          break;
        default:
          break;
      }

      let actionsArray = [];
      const { ticks, uniqueObjects } = await this.prepareObjects(roomData.ticks, opts);

      opts.uniqueObjects = uniqueObjects

      const tickKeys = Object.keys(ticks);
      for (let t = 0; t < tickKeys.length; t += 1) {
        const tick = tickKeys[t];
        opts.isFirstTick = t === 0
        if (ticks[tick]) {
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
