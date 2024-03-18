import handleCombinedRoomStats from "../data/combineResults.js";
import UploadStats, { UploadStatus, UploadCombinedData } from "../data/upload.js";
import { sleep } from "../helper/index.js";
import { getCycle, cycleStatus } from "../helper/requests.js";
import processOpts from "../process/index.js";
import { GetUserData } from "../helper/users.js"

const useProxy = process.env.WEBSHARE_TOKEN !== undefined;

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
        const proxies = Array.from({ length: Number(process.env.WEBSHARE_PROXYAMOUNT) }, (_, index) => proxy(cycle, index));
        await Promise.all(proxies);
        cycle = proxyCycles;
      }
      else {
        for (let i = cycleLength - 1; i >= 0; i -= 1) {
          const opts = cycle[i];
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
        userData.tick = tick;
        stats.users[username] = handleCombinedRoomStats(user, userData);
        await UploadCombinedData(stats.users[username].stats, tick, username)
      }
      await UploadStats(stats, timestamp)
      const timeTaken = Date.now() - start;

      const percentageOnTarget = (cycleLength * 500 * 60) / timeTaken;
      const timePerRoom = (Date.now() - start) / cycleLength
      const types = {}
      for (let u = 0; u < status.processed.length; u += 1) {
        const { type } = status.processed[u];
        types[type] = types[type] || 0;
        types[type] += 1;
      }
      const roomsUploaded = {};
      for (let u = 0; u < status.processed.length; u += 1) {
        const { shard, room } = status.processed[u];
        roomsUploaded[shard] = roomsUploaded[shard] || {};
        roomsUploaded[shard][room] = 1;
      }
      for (let u = 0; u < status.failed.length; u += 1) {
        const { shard, room } = status.failed[u];
        roomsUploaded[shard] = roomsUploaded[shard] || {};
        roomsUploaded[shard][room] = 1;
      }
      await UploadStatus({
        cycleDetails:
        {
          amount: cycleLength, success: status.processed.length, failed: status.failed.length,
          successRate: Math.round((status.processed.length / cycleLength) * 100),
          roomsUploaded
        },
        timePerRoom, percentageOnTarget, timeTaken
      })
    }
    else {
      await sleep(1000 * 60);
    }

    this.executeCycle();
  }
}
