/* eslint-disable no-undef */

import { sleep } from "../../src/helper/index.js"
import { GetRoomTotal } from "../../src/helper/rooms.js"

describe("Helper files", () => {
  describe("index.js", () => {
    it("should sleep", async () => {
      const start = Date.now();
      await sleep(1000);
      const end = Date.now() - start;
      expect(Math.round(end / 1000) * 1000).toBe(1000)
    })
  })
  describe("rooms.js", () => {
    it("should return roomTotal", () => {
      const userData = { shard: { owned: ['1'], reserved: ['2'] } }
      expect(GetRoomTotal(userData, 'owned')).toBe(1)
      expect(GetRoomTotal(userData, 'reserved')).toBe(1)
      expect(GetRoomTotal(userData, 'total')).toBe(2)
      expect(GetRoomTotal(userData, '')).toBe(0)
    })
  })
})