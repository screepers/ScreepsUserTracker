import fs from "fs";
import { GetShards } from "../data/helper.js";
import {
  GetWorldSize,
  GetMapStats,
  GetGclOfUsers,
} from "../data/screepsApi.js";
import { mainLogger as logger } from "../logger.js";

const shards = GetShards();

async function getRoomNames(shard) {
  const rooms = [];
  const size = await GetWorldSize(shard);
  for (let x = 0; x < size.width / 2; x += 1) {
    for (let y = 0; y < size.height; y += 1) {
      rooms.push(`E${x}N${y}`);
      rooms.push(`W${x}N${y}`);
      rooms.push(`E${x}S${y}`);
      rooms.push(`W${x}S${y}`);
    }
  }

  return rooms;
}

async function getUsers(shard, rooms) {
  const mapStats = await GetMapStats(shard, rooms);
  if (!mapStats) return [];

  const { stats, users } = mapStats;

  const roomsByUsername = {};
  Object.entries(stats).forEach(([room, stat]) => {
    const { own } = stat;
    if (own) {
      const { username, _id } = users[own.user];
      if (!roomsByUsername[username]) {
        roomsByUsername[username] = { id: _id, owned: [], reserved: [] };
      }
      if (own.level > 0) {
        roomsByUsername[username].owned.push(room);
      } else {
        roomsByUsername[username].reserved.push(room);
      }
    }
  });

  return roomsByUsername;
}

async function UpdateRooms() {
  try {
    const users = {};
    const gcls = await GetGclOfUsers();

    for (let s = 0; s < shards.length; s += 1) {
      const shard = shards[s];
      const rooms = await getRoomNames(shard);
      const usersPerShard = await getUsers(shard, rooms);

      const usernames = Object.keys(usersPerShard);
      for (let u = 0; u < usernames.length; u += 1) {
        const username = usernames[u];
        const userData = usersPerShard[username];

        if (!users[username]) {
          users[username] = {
            shards: {},
            id: userData.id,
            gcl: gcls[username],
          };
        }
        users[username].shards[shard] = {
          owned: userData.owned,
          reserved: userData.reserved,
        };
      }
    }

    delete users.Invader;
    fs.writeFileSync("./files/users.json", JSON.stringify(users));
  } catch (error) {
    if (error.message && error.message.startsWith("Rate limit exceeded"))
      return;
    logger.error(error);
  }
}

export default UpdateRooms;
