/* eslint-disable no-undef */
import ProcessDataBroker from "../../src/data/broker/processData.js";
import handleCombinedRoomStats from "../../src/data/combineResults.js";

const username1 = "username1"
const username2 = "username2"

const shard1 = "shard1"
const shard2 = "shard2"

const room1 = "room1"
const room2 = "room2"

const opts1 = {
  shard: shard1,
  room: room1,
  type: "owned",
  tick: 100,
  username: username1
};
const userData1 = { shards: { [opts1.shard]: { [opts1.type]: [opts1.room] } } }

describe("Owned data type process check", () => {
  describe("First tick only", () => {
    it('should count totals correctly', async () => {
      const roomData = {
        "timestamp": 1696879096144,
        "room": "E11N5",
        "base": 263700,
        "ticks": {
          [opts1.tick]: {
            "a": {
              type: "creep",
              body: {}
            }
          },
          [opts1.tick + 1]: {
            "a": {

            }
          }
        }
      }
      const stats = await ProcessDataBroker.single(roomData, opts1);
      const shards = { [opts1.shard]: { [opts1.room]: stats } }
      const combinedData = handleCombinedRoomStats(shards, userData1);
      expect(true)
    })
    it('should count type totals correctly', () => {
      expect(true)
    })
    it('should handle construction correctly', () => {
      expect(true)
    })
    it('should handle resourcesStored & minerals correctly', () => {
      expect(true)
    })
    it('should handle controller correctly', () => {
      expect(true)
    })
    it('should handle spawning correctly', () => {
      expect(true)
    })
    it('should handle structureHits correctly', () => {
      expect(true)
    })
  })
  describe("Every tick", () => {
    it('should handle controller correctly', () => {
      expect(true)
    })
    it('should handle intentCategories correctly', () => {
      expect(true)
    })
    it('should handle spawns correctly', () => {
      expect(true)
    })
    it('should count totals correctly', () => {
      expect(true)
    })
  })
})