import GetRooms from "../../rooms/userHelper.js";
import { GetShards } from "../helper.js";
import {GetLeaderboardRank, GetGclObject} from "./helper.js"
import * as dotenv from "dotenv";

dotenv.config();
const shards = GetShards();

async function handleUser(username) {
  const user = GetRooms(username);
  const stats = {shards:{}, overview:{}};

  const { rooms, total } = user;
  shards.forEach((shard) => {
    if (rooms[shard]) {
      const { owned, reserved } = rooms[shard];
      stats.shards[shard] = {
        total: owned.length + reserved.length,
        owned: owned.length,
        reserved: reserved.length,
      };
    } else {
      stats.shards[shard] = {
        total: 0,
        owned: 0,
        reserved: 0,
      };
    }
  });

  stats.gcl = await GetGclObject(username)
  stats.leaderboard = await GetLeaderboardRank(username)
  stats.overview.ownedTotal = total;

  return stats;
}

export default async function handleUsers(usernames) {
  const stats = {};
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    stats[username] =await handleUser(username);
  }

  return stats;
}
