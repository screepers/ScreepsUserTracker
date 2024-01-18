import fs from 'fs';

import handleOwnedObjects from "../converter/manage/ownedRoom.js";
import handleReservedObjects from "../converter/manage/reservedRoom.js";

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

    const startTime = Date.now();
    const firstTickObjectsPromises = firstTickObjects.map(async ([id, firstTickObject]) => {
      const startTime1 = Date.now();
      if (opts.userId === firstTickObject.user) {
        const uniqueObject = cleanSource(firstTickObject);
        uniqueObjects[id] = uniqueObject;

        for (let t = 0; t < tickKeys.length; t += 1) {
          const tick = tickKeys[t];
          let object = ticks[tick][id];
          if (!object) ticks[tick][id] = {
            type: uniqueObject.type,
          }
          await prepareObject(ticks[tick][id], uniqueObject);
        }
      }
      const endTime1 = Date.now();
      const timeTaken1 = endTime1 - startTime1;
      fs.appendFileSync('log.txt', `prepareObject: ${timeTaken1}ms\n`);
    })
    await Promise.all(firstTickObjectsPromises);
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    fs.appendFileSync('log2.txt', `prepareObject: ${timeTaken}ms\n`);

    for (let t = 0; t < tickKeys.length; t += 1) {
      const tick = tickKeys[t];
      const objects = ticks[tick] || {};

      const summarize = summarizeObjects(objects);
      data.ticks[tick] = {
        objects,
        summarize,
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
