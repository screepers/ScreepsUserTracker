import "dotenv/config";
import { ScreepsAPI } from "screeps-api";
import { apiLogger as logger } from "../helper/logger.js";

let path;
switch (process.env.SERVER_TYPE) {
  case "seasonal":
    path = "/season/";
    break;
  case "mmo":
  default:
    path = "/";
    break;
}

let api = new ScreepsAPI({
  token: process.env.SCREEPS_TOKEN,
  path,
});
if (process.env.PRIVATE_SERVER_USERNAME) {
  api = new ScreepsAPI({
    token: process.env.SCREEPS_TOKEN,
    protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
    hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
    port: process.env.PRIVATE_SERVER_PORT || 443,
    path,
  });
  await api.auth(
    process.env.PRIVATE_SERVER_USERNAME,
    process.env.PRIVATE_SERVER_PASSWORD
  );
}

function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const lastTickCache = {
}
export default async function GetGameTime(shard) {
  try {
    if (lastTickCache[shard] && lastTickCache[shard].lastUpdate + 10 * 1000 > Date.now()) {
      return lastTickCache[shard].tick;
    }
    await sleep(500);

    const timeResult = await api.raw.game.time(shard);
    if (typeof timeResult !== "object" || !timeResult.ok)
      throw new Error(JSON.stringify(timeResult));
    logger.info(`TickApi: ${shard}/${timeResult.time}`);
    lastTickCache[shard] = {
      tick: timeResult.time,
      lastUpdate: Date.now(),
    }
    return lastTickCache[shard].tick;
  } catch (error) {
    logger.error(error);
    return undefined;
  }
}
