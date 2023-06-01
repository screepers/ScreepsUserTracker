import axios from "axios";
import * as dotenv from "dotenv";
import { ScreepsAPI } from "screeps-api";
import { apiLogger as logger } from "./logger.js";

dotenv.config();

let path;
switch (process.env.SERVER_TYPE) {
  case "season":
    path = "/season/";
    break;
  case "mmo":
  default:
    path = "/";
    break;
}

const api = new ScreepsAPI({
  token: process.env.SCREEPS_TOKEN,
  protocol: "https",
  hostname: "screeps.com",
  port: 443,
  path,
});

export async function GetGameTime(shard) {
  try {
    const time = await api.raw.game.time(shard);
    if (typeof time !== "object") throw time;
    return time.time;
  } catch {
    return undefined;
  }
}

export async function GetRoomHistory(shard, room, tick) {
  try {
    const history = await api.raw.history(room, tick, shard);
    return history;
  } catch {
    return undefined;
  }
}
