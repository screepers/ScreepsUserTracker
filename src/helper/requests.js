import { CronJob } from "cron";
import Cache from "../setup/cache.js";
import { GetGameTime } from "../process/screepsApi.js"
import { requestLogger as logger } from "./logger.js"
import { GetUserData } from "./users.js";
import { UploadStatus } from "../data/upload.js";

const syncedTicks = {}
const lastLiveTicks = {}

export function getLiveTick(shard) {
  return lastLiveTicks[shard] || 0;
}

export function getSyncedTick(shard) {
  const liveTick = getLiveTick(shard) - 1000;
  if (syncedTicks[shard] < liveTick) {
    syncedTicks[shard] += 100;
    return syncedTicks[shard];
  }
  if (!syncedTicks[shard]) {
    // eslint-disable-next-line no-nested-ternary
    let tick = process.env.MIN_TICK !== undefined
      ? Number.parseInt(process.env.MIN_TICK || "-1", 10)
      : lastLiveTicks[shard] ? lastLiveTicks[shard] - 1000 : 0;
    tick = Math.round(tick / 100) * 100

    syncedTicks[shard] = tick;

    UploadStatus({ syncedTicks, liveTicks: lastLiveTicks })
    return tick;
  }

  return undefined;
}

export async function getCycle() {
  const shards = await Cache.getRoomsCache();
  const cycle = [];

  const shardNames = Object.keys(shards);
  for (let s = 0; s < shardNames.length; s += 1) {
    const shardName = shardNames[s];
    const tick = getSyncedTick(shardName);

    if (tick) {
      const shardRooms = shards[shardName];
      const roomNames = Object.keys(shardRooms);
      for (let r = 0; r < roomNames.length; r += 1) {
        const roomName = roomNames[r];
        const room = shardRooms[roomName];
        const userData = GetUserData(room.username);
        cycle.push({
          shard: shardName,
          room: roomName,
          username: room.username,
          userId: userData.id,
          type: room.type,
          tick,
        });
      }

      logger.info(`Cycle shard:${shardName} tick:${tick} items:${cycle.length}`)
    }
  }

  return cycle;
}

export function cycleStatus(cycle) {
  const status = {
    processed: [],
    failed: [],
  };
  for (let i = 0; i < cycle.length; i += 1) {
    const opts = cycle[i];
    if (opts.data) {
      status.processed.push(opts)
    }
    else {
      status.failed.push(opts)
    }
  }
  return status;
}

async function liveTickUpdater() {
  const shards = await Cache.getRoomsCache();
  const shardNames = Object.keys(shards);
  for (let s = 0; s < shardNames.length; s += 1) {
    const shardName = shardNames[s];
    lastLiveTicks[shardName] = await GetGameTime(shardName);
  }
}

// eslint-disable-next-line no-new
new CronJob(
  "*/5 * * * *",
  liveTickUpdater,
  null,
  true,
  "Europe/Amsterdam",
);
liveTickUpdater()