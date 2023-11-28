import { getCycle as getCycleHelper, cycleStatus } from "../helper/requests.js";
import process from "../process/index.js";
import { CronJob } from "cron";

const syncedTicks = {}
const lastLiveTicks = {}

export default class Requests {
  static async getTick(shard) {
    return syncedTicks[shard] || lastLiveTicks[shard] || 0;

  }
  static async executeCycle() {
    const tick = await this.getTick();
    const cycle = await getCycleHelper(tick);
    for (let i = 0; i < cycle.length; i++) {
      const opts = cycle[i];
      await process(opts);
    }

    const status = cycleStatus(cycle);
    const users = {}
    for (let p = 0; p < status.processed.length; p++) {
      const opts = status.processed[p];
      const { username } = opts;
      users[username] = users[username] || [];
      users[username].push(opts);
    }

    this.executeCycle();
  }
}

function liveTickUpdater() {

}

new CronJob(
  "*/5 * * * *",
  liveTickUpdater,
  null,
  true,
  "Europe/Amsterdam",
);