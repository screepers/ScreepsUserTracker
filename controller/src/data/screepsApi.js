import { ScreepsAPI } from "screeps-api";
import * as dotenv from "dotenv";
import { apiLogger as logger } from "../logger.js";

dotenv.config();

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
  protocol: "https",
  hostname: "screeps.com",
  port: 443,
  path,
});

function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GetGclOfUsers() {
  try {
    const gcls = {};

    let offset = 0;
    const mode = "world";
    let hasUsersLeft = true;

    while (hasUsersLeft) {
      const leaderboard = await api.raw.leaderboard.list(20, mode, offset);
      if (!leaderboard.ok) throw new Error(JSON.stringify(leaderboard));
      logger.debug(leaderboard);
      offset += 20;

      const users = Object.values(leaderboard.users);
      users.forEach((user) => {
        gcls[user.username] = user.gcl;
      });

      if (users.length === 0) hasUsersLeft = false;
      sleep(500);
    }

    return gcls;
  } catch (error) {
    logger.error(error);
    return {};
  }
}

export async function GetPowerOfUsers() {
  try {
    const powers = {};

    let offset = 0;
    const mode = "power";
    let hasUsersLeft = true;

    while (hasUsersLeft) {
      const leaderboard = await api.raw.leaderboard.list(20, mode, offset);
      if (!leaderboard.ok) throw new Error(JSON.stringify(leaderboard));
      logger.debug(leaderboard);
      offset += 20;

      const list = Object.values(leaderboard.list);
      list.forEach((rank) => {
        const user = leaderboard.users[rank.user];
        powers[user.username] = rank.score;
      });

      if (list.length === 0) hasUsersLeft = false;
      sleep(500);
    }

    return powers;
  } catch (error) {
    logger.error(error);
    return {};
  }
}

export async function GetScoresOfUsers() {
  try {
    const scores = {};

    let offset = 0;
    let hasUsersLeft = true;

    while (hasUsersLeft) {
      const scoreboard = await api.raw.scoreboard.list(20, offset);
      if (!scoreboard.ok) throw new Error(JSON.stringify(scoreboard));
      logger.debug(scoreboard);
      offset += 20;

      const users = Object.values(scoreboard.users);
      users.forEach((user) => {
        scores[user.username] = user.score;
      });

      if (users.length === 0) hasUsersLeft = false;
      sleep(250);
    }

    return scores;
  } catch (error) {
    logger.error(error);
    return {};
  }
}

export async function GetWorldSize(shard) {
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

export async function GetMapStats(shard, rooms) {
  try {
    const mapStats = await api.raw.game.mapStats(rooms, "owner0", shard);
    if (!mapStats.ok) throw new Error(JSON.stringify(mapStats));
    logger.debug(mapStats);
    return mapStats;
  } catch (error) {
    logger.error(error);
    return undefined;
  }
}

export async function GetGameTime(shard) {
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
