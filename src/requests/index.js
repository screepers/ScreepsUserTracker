import handleCombinedRoomStats from "../data/combineResults.js";
import UploadStats, { UploadStatus } from "../data/upload.js";
import { sleep } from "../helper/index.js";
import { getCycle, cycleStatus } from "../helper/requests.js";
import processOpts from "../process/index.js";
import { GetUserData } from "../helper/users.js"
import { requestLogger as logger } from "../helper/logger.js"

const useProxy = process.env.WEBSHARE_TOKEN !== undefined;
const maxProxyIndex = process.env.WEBSHARE_PROXYAMOUNT;

async function proxy(cycle, proxyIndex) {
  while (cycle.length > 0) {
    const opts = cycle.pop();
    await processOpts(opts, proxyIndex);
  }
}


export default class Requests {
  static async executeCycle() {
    const cycle = await getCycle();
    const cycleLength = cycle.length;
    if (cycleLength === 0) {
      await sleep(1000 * 10);
    }
    else {
      const start = Date.now();
      logger.info(`Executing cycle ${cycleLength}`)

      if (useProxy) {
        const proxies = Array.from({ length: maxProxyIndex }, (_, index) => proxy(cycle, index));
        await Promise.all(proxies);
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
        const userData = GetUserData(username)
        stats[username] = handleCombinedRoomStats(user, userData);
      }
      await UploadStats(stats, timestamp)
      const timeTaken = Date.now() - start;
      const percentageOnTarget = (cycleLength * 500 * 60) / timeTaken;
      UploadStatus({ amountPerCycle: cycleLength, timePerRoom: (Date.now() - start) / cycleLength, percentageOnTarget })
    }
    this.executeCycle();
  }
}