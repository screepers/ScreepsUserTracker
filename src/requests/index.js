import handleCombinedRoomStats from "../data/combineResults.js";
import UploadStats from "../data/upload.js";
import { sleep } from "../helper/index.js";
import { getCycle as getCycleHelper, cycleStatus } from "../helper/requests.js";
import process from "../process/index.js";
import { GetUserData } from "../helper/users.js"

export default class Requests {
  static async executeCycle() {
    const cycle = await getCycleHelper();
    if (cycle.length > 0) {
      await sleep(1000 * 10);
    }
    for (let i = 0; i < cycle.length; i += 1) {
      const opts = cycle[i];
      console.log(`${i + 1} / ${cycle.length} of cycle ${opts.shard}/${opts.tick}`)
      await process(opts);
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
    for (let u = 0; u < usernames.length; u += 1) {
      const username = usernames[u];
      const user = users[username];
      const userData = await GetUserData(username)
      const stats = handleCombinedRoomStats(user, userData);
      await UploadStats(stats, timestamp)
    }

    this.executeCycle();
  }
}



