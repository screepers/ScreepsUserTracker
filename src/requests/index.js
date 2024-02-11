import handleCombinedRoomStats from "../data/combineResults.js";
import UploadStats, { UploadStatus, UploadCombinedData } from "../data/upload.js";
import { sleep } from "../helper/index.js";
import { getCycle, cycleStatus } from "../helper/requests.js";
import processOpts from "../process/index.js";
import { GetUserData } from "../helper/users.js"
import { requestLogger as logger } from "../helper/logger.js"

const useProxy = process.env.WEBSHARE_TOKEN !== undefined;
const maxProxyIndex = process.env.WEBSHARE_PROXYAMOUNT;

let proxyCycles = [];

async function proxy(cycle, proxyIndex) {
  while (cycle.length > 0) {
    const opts = cycle.pop();
    await processOpts(opts, proxyIndex);
    proxyCycles.push(opts);
  }
}


export default class Requests {
  static async executeCycle() {
    let cycle = await getCycle();
    const cycleLength = cycle.length;
    if (cycleLength > 0) {
      const start = Date.now();

      if (useProxy) {
        proxyCycles = [];
        const proxies = Array.from({ length: maxProxyIndex }, (_, index) => proxy(cycle, index));
        await Promise.all(proxies);
        cycle = proxyCycles;
      }
      else {
        for (let i = cycleLength - 1; i >= 0; i -= 1) {
          const opts = cycle[i];
          console.log(`${cycleLength - i} / ${cycleLength} of cycle ${opts.shard}/${opts.tick}`)
          await processOpts(opts, undefined);
        }
      }

      const status = cycleStatus(cycle);
      const users = {}
      let timestamp;
      let tick;
      for (let p = 0; p < status.processed.length; p += 1) {
        const opts = status.processed[p];
        const { username, shard, room, data } = opts;
        users[username] = users[username] || {};
        users[username][shard] = users[username][shard] || {}
        users[username][shard][room] = data;
        timestamp = opts.timestamp;
        tick = opts.tick;
      }

      const usernames = Object.keys(users);
      const stats = { users: {} };
      for (let u = 0; u < usernames.length; u += 1) {
        const username = usernames[u];
        const user = users[username];
        const userData = GetUserData(username)
        stats.users[username] = handleCombinedRoomStats(user, userData);
        await UploadCombinedData(stats.users[username].stats, tick, username)
      }
      await UploadStats(stats, timestamp)
      const timeTaken = Date.now() - start;
      const percentageOnTarget = (cycleLength * 500 * 60) / timeTaken;
      const timePerRoom = (Date.now() - start) / cycleLength
      await UploadStatus({ amountPerCycle: cycleLength, timePerRoom, percentageOnTarget })
        if (opts.timestamp) timestamp = opts.timestamp;
      }

      if (timestamp) {
        const usernames = Object.keys(users);
        const stats = { users: {} };
        for (let u = 0; u < usernames.length; u += 1) {
          const username = usernames[u];
          const user = users[username];
          const userData = GetUserData(username)
          stats.users[username] = handleCombinedRoomStats(user, userData);
        }
        await UploadStats(stats, timestamp)
        const timeTaken = Date.now() - start;
        const percentageOnTarget = (cycleLength * 500 * 60) / timeTaken;
        const timePerRoom = (Date.now() - start) / cycleLength
        await UploadStatus({ cycleDetails: { amount: cycleLength, success: status.processed.length, failed: status.failed.length, successRate: Math.round((status.processed.length / cycleLength) * 100) }, timePerRoom, percentageOnTarget, timeTaken })
      }
      await sleep(1000 * 1);
    }
    else {
      await sleep(1000 * 60);
    }

    this.executeCycle();
  }
}
