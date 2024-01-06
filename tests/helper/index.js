import ProcessDataBroker from "../../src/data/broker/processData.js";
import handleCombinedRoomStats from "../../src/data/combineResults.js";

function baseData(type, object = {}) {
  switch (type) {
    case TestHelper.dataTypes.creep:
      object.type = 'creep'
      break;
    case TestHelper.dataTypes.structure:
      break;
    default:
      break;
  }

  return object;
}

export default class TestHelper {
  username;
  room;
  shard;
  type;

  opts = {
    username: this.username,
    room: this.room,
    shard: this.shard,
    tick: 0
  }
  userData = { shards: { [this.shard]: { [this.type]: [this.room] } } }

  constructor(username, shard, room, type) {
    this.username = username;
    this.shard = shard;
    this.room = room;
    this.type = type
  }

  /*
  / Settings model
  / Array of setting
  / Type: dataTypes
  / Data: {[TICK]:{CHANGES}}
  */
  generateData(settings) {
    const tickData = {}
    for (let i = 0; i < 100; i++) {
      tickData[i] = {};
    }

    for (let s = 0; s < settings.length; s++) {
      const setting = settings[s];
      if (!setting.data) setting.data = {}
      const ticks = Object.keys(settings.data)
      if (ticks.length === 0 || !ticks.includes(0)) {
        tickData[0][s] = baseData(setting.type, setting.data[0])
      }

      for (let t = 0; t < ticks.length; t++) {
        const tick = ticks[t];
        if (tick === 0) {
          tickData[tick][s] = baseData(setting.type, setting.data[tick])
        }
        else {
          tickData[tick][s] = setting.data[tick];
        }
      }
    }

    return {
      timestamp: 0,
      room: this.room,
      base: 0,
      ticks: tickData
    }
  }

  static dataTypes = {
    creep: 1,
    structure: 2,
  }

  async process(settings) {
    const roomData = this.generateData(settings);
    const stats = await ProcessDataBroker.single(roomData, opts);
    const shards = { [this.shard]: { [this.room]: stats } }
    return handleCombinedRoomStats(shards, userData);
  }
}