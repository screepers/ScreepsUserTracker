import "dotenv/config";
import { ScreepsAPI } from "screeps-api";
import { apiLogger as logger } from "../logger.js";

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

const api = new ScreepsAPI({
  token: process.env.SCREEPS_TOKEN,
  protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
  hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
  port: process.env.PRIVATE_SERVER_PORT || 443,
  path,
});
if (process.env.PRIVATE_SERVER_USERNAME) await api.auth(process.env.PRIVATE_SERVER_USERNAME, process.env.PRIVATE_SERVER_PASSWORD);

function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GetWorldSize(shard) {
  await sleep(500);

  try {
    const size = await api.raw.game.worldSize(shard);
    if (!size.ok) throw new Error(JSON.stringify(size));
    logger.debug(size);
    return size;
  } catch (error) {
    logger.error(error);
    return 0;
  }
}

export async function GetGameTime(shard) {
  await sleep(500);

  try {
    const time = await api.raw.game.time(shard);
    if (typeof time !== "object" || !time.ok)
      throw new Error(JSON.stringify(time));
    logger.debug(time);
    return time.time;
  } catch (error) {
    logger.error(error);
    return undefined;
  }
}
