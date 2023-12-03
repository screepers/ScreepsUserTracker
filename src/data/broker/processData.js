import handleOwnedObjects from "../converter/manage/ownedRoom.js";
import handleReservedObjects from "../converter/manage/reservedRoom.js";

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

  static async single(roomData, opts) {
    this.setTickRate(roomData, opts);

    let actionsArray = [];
    const { ticks } = roomData;

    const originalObjects = {};
    const tickKeys = Object.keys(ticks);
    for (let t = 0; t < tickKeys.length; t += 1) {
      const tick = tickKeys[t];
      const tickList = ticks[tick] || [];
      const objectKeys = Object.keys(tickList);
      for (let o = 0; o < objectKeys.length; o += 1) {
        const objectId = objectKeys[o];
        const object = tickList[objectId];
        if (!originalObjects[objectId]) originalObjects[objectId] = object;
      }
    }

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

    for (let t = 0; t < tickKeys.length; t += 1) {
      const tick = tickKeys[t];
      if (ticks[tick]) {
        actionsArray = actionsArray.concat(
          await handleObjects(opts.username, ticks[tick], {
            previousObjects: ticks[tickKeys[t - 1]],
            originalObjects,
            ticks,
            tick,
            type: opts.type,
            isFirstTick: t === 0,
            shard: opts.shard,
          })
        );
      }
    }



    if (process.env.CHECK_FOR_NEW_ACTIONS === "TRUE")
      ActionProcessor.FindNewDefaultActions(actionsArray, opts.type);

    return ActionProcessor.getStats(actionsArray);
  }
}
