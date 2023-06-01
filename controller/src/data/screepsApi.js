import { ScreepsAPI } from "screeps-api";
import * as dotenv from "dotenv";
import { apiLogger as logger }from "../logger.js"

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GetGclOfUser(username) {
  try {
    const response = await api.raw.user.find(username);
    logger.debug(response)
    return response.user.gcl;
  } catch (error) {
    logger.error(error)
    return 0;
  }
}

export async function GetLeaderboardRankObject(username) {
  try {
    const mode = "world";
    const rank = await api.raw.leaderboard.find(username, mode);

    logger.debug(rank)
    return {
      rank: rank.rank + 1,
      score: rank.score,
    };
  } catch  (error) {
    logger.error(error)
    return {};
  }
}

export async function GetGclOfUsers() {
  try {
    const gcls = {};

    let offset = 0;
    const mode = "world";
    let hasUsersLeft = true;

    while (hasUsersLeft) {
      const leaderboard = await api.raw.leaderboard.list(20, mode, offset);
      logger.debug(leaderboard)
      offset += 20;

      const users = Object.values(leaderboard.users);
      users.forEach((user) => {
        gcls[user.username] = user.gcl;
      });

      if (users.length === 0) hasUsersLeft = false;
      sleep(250)
    }

    return gcls;
  } catch (error) {
    logger.error(error)
    return {};
  }
}

export async function GetWorldSize(shard) {
  try {
    const size = await api.raw.game.worldSize(shard);
    logger.debug(size)
    return size;
  } catch (error){
    logger.error(error)
    return 0;
  }
}

export async function GetMapStats(shard, rooms) {
  try {
    const mapStats = await api.raw.game.mapStats(rooms, "owner0", shard);
    logger.debug(mapStats)
    return mapStats;
  } catch (error){
    logger.error(error)
    return undefined;
  }
}
