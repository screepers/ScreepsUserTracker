import ProcessDataBroker from "../../src/data/broker/processData.js";
import handleCombinedRoomStats from "../../src/data/combineResults.js";

export default class TestHelper {
  username;

  room;

  shard;

  type;

  opts;

  userData;

  constructor(username, shard, room, type) {
    this.username = username;
    this.shard = shard;
    this.room = room;
    this.type = type
    this.opts = {
      username,
      room,
      shard,
      tick: 0,
      type
    }

    this.userData = { shards: { [shard]: { [type]: [room] } }, username }
    if (type === "reserved") {
      this.userData.shards[shard].owned = [];
    }
  }

  static baseData(type, object = {}) {
    switch (type) {
      case this.dataTypes.road:
      case this.dataTypes.rampart:
      case this.dataTypes.constructedWall:
      case this.dataTypes.spawn:
      case this.dataTypes.extension:
      case this.dataTypes.link:
      case this.dataTypes.storage:
      case this.dataTypes.tower:
      case this.dataTypes.observer:
      case this.dataTypes.powerSpawn:
      case this.dataTypes.extractor:
      case this.dataTypes.lab:
      case this.dataTypes.terminal:
      case this.dataTypes.container:
      case this.dataTypes.nuker: {
        const actualType = Object.keys(this.dataTypes).find(key => this.dataTypes[key] === type)
        object.type = actualType

        switch (type) {
          default:
            break;
        }
        break;
      }
      case this.dataTypes.creep:
        object.type = 'creep'
        if (!object.body) object.body = [];
        break;
      case this.dataTypes.constructionSite:
        object.type = 'constructionSite'
        break;
      case this.dataTypes.mineral:
        object.type = 'mineral'
        break;
      case this.dataTypes.controller:
        object.type = 'controller'
        break;
      /* istanbul ignore next */
      default:
        break;
    }

    return object;
  }

  generateData(settings) {
    const tickData = {}
    for (let i = 0; i < 100; i += 1) {
      tickData[i] = {};
    }

    for (let s = 0; s < settings.length; s += 1) {
      const setting = settings[s];
      if (!setting.data) setting.data = {}
      const ticks = Object.keys(setting.data)
      if (ticks.length === 0 || !ticks.includes("0")) {
        tickData[0][s] = TestHelper.baseData(setting.type, setting.data[0])
      }

      for (let t = 0; t < ticks.length; t += 1) {
        const tick = ticks[t];
        if (tick === '0') {
          tickData[tick][s] = TestHelper.baseData(setting.type, setting.data[tick])
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
    road: 1,
    rampart: 2,
    constructedWall: 3,
    spawn: 4,
    extension: 5,
    link: 6,
    storage: 7,
    tower: 8,
    observer: 9,
    powerSpawn: 10,
    extractor: 11,
    lab: 12,
    terminal: 13,
    container: 14,
    nuker: 15,
    creep: 16,
    constructionSite: 17,
    mineral: 18,
    controller: 19
  }

  /*
  / Settings model
  / Array of setting
  / Type: dataTypes
  / Data: {[TICK]:{CHANGES}}
  */
  async process(settings) {
    const roomData = this.generateData(settings);
    const stats = await ProcessDataBroker.single({ roomData, opts: this.opts });
    const shards = { [this.shard]: { [this.room]: stats } }
    return { opts: this.opts, stats: { users: { [this.username]: handleCombinedRoomStats(shards, this.userData) } } };
  }
}