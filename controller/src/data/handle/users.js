import * as dotenv from "dotenv";
import { GetUserData } from "../../rooms/userHelper.js";
import { GetShards } from "../helper.js";
// import { GetLeaderboardRankObject } from "../screepsApi.js"
// import { GetGclObject} from "./helper.js"

dotenv.config();
const shardNames = GetShards();

async function handleUser(username) {
  const user = GetUserData(username);
  const { shards, gcl, power, score } = user;

  if (!gcl) delete user["gcl"]
  if (!power) delete user["power"]
  if (!score) delete user["score"]
  const stats = {
    shards: {},
    overview: { gcl, power, score },
  };

  shardNames.forEach((shard) => {
    if (shards[shard]) {
      const { owned, reserved } = shards[shard];
      stats.shards[shard] = {
        roomTotals: {
          total: owned.length + reserved.length,
          owned: owned.length,
          reserved: reserved.length,
        },
      };
    } else {
      stats.shards[shard] = {
        roomTotals: {
          total: 0,
          owned: 0,
          reserved: 0,
        },
      };
    }
  });

  return stats;
}

export default async function handleUsers(usernames) {
  const stats = {};
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    stats[username] = await handleUser(username);
  }

  return stats;
}
