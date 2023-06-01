import fs from "fs";
import { GetShards } from "../data/helper.js";
import { GetWorldSize, GetMapStats } from "../data/screepsApi.js";

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

    for (let s = 0; s < shards.length; s += 1) {
      const shard = shards[s];
      const rooms = await getRoomNames(shard);
      const usersPerShard = await getUsers(shard, rooms);
      Object.entries(usersPerShard).forEach(([username, userData]) => {
        if (!users[username]) {
          users[username] = { shards: {}, id: userData.id };
        }
        users[username].shards[shard] = {
          owned: userData.owned,
          reserved: userData.reserved,
        };
      });
    }

    let userCounts = {};
    Object.entries(users).forEach(([username, data]) => {
      const count = Object.values(data.shards).reduce(
        (acc, val) => acc + val.owned.length,
        0
      );
      userCounts[username] = count;
    });

    userCounts = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .filter((u) => u[0] !== "Invader");

    fs.writeFileSync("./files/users.json", JSON.stringify(users));
    fs.writeFileSync("./files/userRoomsCount.json", JSON.stringify(userCounts));
  } catch (error) {
    if (error.message && error.message.startsWith("Rate limit exceeded"))
      return;
    logger.error(error);
  }
}

export default UpdateRooms;
