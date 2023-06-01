import { ScreepsAPI } from "screeps-api";
import * as dotenv from "dotenv";

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

export async function GetGclOfUser(username) {
  try {
    const response = await api.raw.user.find(username);
    return response.user.gcl;
  } catch (error) {
    return 0;
  }
}

export async function GetLeaderboardRankObject(username) {
  try {
    const mode = "world";
    const month = new Date().getMonth();
    const season = `${new Date().getFullYear()}-${
      month < 10 ? `0${month}` : month
    }`;
    const rank = await api.raw.leaderboard.find(username, mode, season);

    return {
      rank: rank.rank + 1,
      score: rank.score,
    };
  } catch {
    return {};
  }
}

export async function GetWorldSize(shard) {
  try {
    const size = await api.raw.game.worldSize(shard);
    return size;
  } catch {
    return 0;
  }
}

export async function GetMapStats(shard, rooms) {
  try {
    const mapStats = await api.raw.game.mapStats(rooms, "owner0", shard);
    return mapStats;
  } catch {
    return undefined;
  }
}
