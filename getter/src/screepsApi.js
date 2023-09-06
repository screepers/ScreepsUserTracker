import "dotenv/config";
import { ScreepsAPI } from "screeps-api";
import settings from "./settings.js";

let path;
switch (settings.serverType) {
  case "seasonal":
    path = "/season/";
    break;
  case "mmo":
  default:
    path = "/";
    break;
}

const api = new ScreepsAPI({
  protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
  hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
  port: process.env.PRIVATE_SERVER_PORT || 443,
  path,
});
if (process.env.PRIVATE_SERVER_USERNAME) await api.auth(process.env.PRIVATE_SERVER_USERNAME, process.env.PRIVATE_SERVER_PASSWORD);

const historyApi = new ScreepsAPI({
  protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
  hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
  port: process.env.PRIVATE_SERVER_PORT || 443,
  path: "/",
});
if (process.env.PRIVATE_SERVER_USERNAME) await historyApi.auth(process.env.PRIVATE_SERVER_USERNAME, process.env.PRIVATE_SERVER_PASSWORD);

export async function GetGameTime(shard) {
  try {
    const time = await api.raw.game.time(shard);
    if (typeof time !== "object" || !time.ok) throw time;
    return time.time;
  } catch {
    return undefined;
  }
}

export async function GetRoomHistory(shard, room, tick) {
  try {
    const history = await historyApi.raw.history(room, tick, shard);

    if (tick === 0) {
      history.ticks["0"] = history.ticks["1"];
      history.ticks["1"] = {};
    }

    return { status: "Success", result: history };
  } catch (error) {
    if (error.message && error.message.includes("404 Not Found"))
      return { status: "Not found", result: null };
    return { status: "Error" };
  }
}
