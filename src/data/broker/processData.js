import handleOwnedObjects from "../converter/manage/ownedRoom.js";
import handleReservedObjects from "../converter/manage/reservedRoom.js";

import prepareObject from "../converter/prepare/object.js";
import { summarizeObjects } from "../converter/helper.js";
import GetIntents from "../converter/intentsHelper.js";

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
    for (let t = 0; t < tickKeys.length; t += 1) {
      const tick = tickKeys[t];
      const objects = ticks[tick] || {};
      const objectKeys = Object.keys(objects);

      for (let o = 0; o < objectKeys.length; o += 1) {
        const objectId = objectKeys[o];
        const object = objects[objectId];
        if (object) {
          if (!uniqueObjects[objectId]) uniqueObjects[objectId] = cleanSource(object);

          const uniqueObject = uniqueObjects[objectId];
          if (opts.userId !== uniqueObject.user) {
            delete objects[objectId];
            delete uniqueObjects[objectId];
          }
        }
      }

      const uniqueObjectKeys = Object.keys(uniqueObjects)
      for (let uo = 0; uo < uniqueObjectKeys.length; uo += 1) {
        const objectId = uniqueObjectKeys[uo];
        const uniqueObject = uniqueObjects[objectId]
        if (!objects[objectId]) objects[objectId] = {
          type: uniqueObject.type,
        }
        await prepareObject(objects[objectId], uniqueObject);
      }

      const summarize = summarizeObjects(objects);
      const intents = GetIntents(objects, uniqueObjects);
      data.ticks[tick] = {
        objects,
        summarize,
        intents
      }
    }

    data.uniqueObjects = uniqueObjects

    return data
  }

  static async single(roomData, opts) {
    this.setTickRate(roomData, opts);

    let handleObjects = null;
    switch (opts.type) {
      case "owned":
        handleObjects = handleOwnedObjects;
        break;
      case "reserved":
        handleObjects = handleReservedObjects;
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
      opts.tick = parseInt(tick, 10);
      if (ticks[tick]) {
        actionsArray = actionsArray.concat(
          await handleObjects(ticks[tick], opts)
        );
      }
    }


    if (process.env.CHECK_FOR_NEW_ACTIONS === "TRUE")
      ActionProcessor.FindNewDefaultActions(actionsArray, opts.type);

    return ActionProcessor.getStats(actionsArray);
  }
}
