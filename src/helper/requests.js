import { CronJob } from "cron";
import Cache from "../setup/cache.js";
import { GetGameTime } from "../process/screepsApi.js"
import { requestLogger as logger } from "./logger.js"
import { GetUserData } from "./users.js";
import { UploadStatus } from "../data/upload.js";

const syncedTicks = {}
const syncedNearCurrentLiveTick = {}
const lastLiveTicks = {}

export function getLiveTick(shard) {
  return lastLiveTicks[shard] || 0;
}

export function getSyncedTick(shard) {
  const liveTick = getLiveTick(shard) - 500;
  if (syncedTicks[shard] < liveTick) {
    if (!syncedNearCurrentLiveTick[shard]) {
      const tick = Math.round((lastLiveTicks[shard] - 5000) / 1000) * 1000;
      syncedNearCurrentLiveTick[shard] = tick;
    }
    else if (syncedNearCurrentLiveTick < liveTick - 5000) {
      syncedNearCurrentLiveTick[shard] += 1000;
      return syncedNearCurrentLiveTick[shard];
    }
    syncedTicks[shard] += 100;
    UploadStatus({ syncedTicks, liveTicks: lastLiveTicks })
    return syncedTicks[shard];
  }
  if (!syncedTicks[shard] && lastLiveTicks[shard]) {
    // eslint-disable-next-line no-nested-ternary
    let tick;

    if (process.env.MIN_TICK !== undefined) tick = Number.parseInt(process.env.MIN_TICK || "-1", 10)
    else if (lastLiveTicks[shard]) tick = lastLiveTicks[shard] - 1000;
    else {
      return undefined;
    }
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
      const roomNames = Object.keys(shardRooms).sort();
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

  // get usernames in status.failed
  const usernames = status.failed.map((opts) => opts.username);
  const uniqueFailedUsernames = [...new Set(usernames)];
  const actuallyProcessed = [];
  for (let i = 0; i < status.processed.length; i += 1) {
    const opts = status.processed[i];
    if (!uniqueFailedUsernames.includes(opts.username)) {
      actuallyProcessed.push(opts);
    }
    else {
      status.failed.push(opts);
    }
  }

  status.processed = actuallyProcessed;
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