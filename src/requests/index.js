import handleCombinedRoomStats from "../data/combineResults.js";
import UploadStats, { UploadStatus } from "../data/upload.js";
import { sleep } from "../helper/index.js";
import { getCycle, cycleStatus } from "../helper/requests.js";
import processOpts from "../process/index.js";
import { GetUserData } from "../helper/users.js"
import { requestLogger as logger } from "../helper/logger.js"

const useProxy = process.env.WEBSHARE_TOKEN === "TRUE";

export default class Requests {
  static async executeCycle() {
    const cycle = await getCycle();
    if (cycle.length === 0) {
      await sleep(1000 * 10);
    }
    else {
      const start = Date.now();
      logger.info(`Executing cycle ${cycle.length}`)

      // make the request execute in parallel while the data is being processed, await results at the end
      await Promise.all(cycle.map(async (opts) => {
        await processOpts(opts, useProxy);
      }))

      // for (let i = cycle.length - 1; i >= 0; i -= 1) {
      //   const opts = cycle[i];
      //   console.log(`${cycle.length - i} / ${cycle.length} of cycle ${opts.shard}/${opts.tick}`)
      //   await processOpts(opts, useProxy);
      // }

      const status = cycleStatus(cycle);
      const users = {}
      let timestamp;
      for (let p = 0; p < status.processed.length; p += 1) {
        const opts = status.processed[p];
        const { username, shard, room, data } = opts;
        users[username] = users[username] || {};
        users[username][shard] = users[username][shard] || {}
        users[username][shard][room] = data;
        timestamp = data.timestamp;
      }

      const usernames = Object.keys(users);
      const stats = {};
      for (let u = 0; u < usernames.length; u += 1) {
        const username = usernames[u];
        const user = users[username];
        const userData = await GetUserData(username)
        stats[username] = handleCombinedRoomStats(user, userData);
      }
      await UploadStats(stats, timestamp)
      UploadStatus({ amountPerCycle: cycle.length, timePerRoom: (Date.now() - start) / cycle.length })
    }
    this.executeCycle();
  }
}