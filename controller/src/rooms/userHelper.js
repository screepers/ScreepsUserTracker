import fs from "fs";
import { GetWorldSize } from "../data/screepsApi.js";

const roomsCache = {
  data: {},
  lastUpdate: 0,
};

export async function GetReactorRoomNames(shard) {
  const rooms = [];
  const size = await GetWorldSize(shard);
  for (let x = 0; x < size.width / 2; x += 1) {
    for (let y = 0; y < size.height / 2; y += 1) {
      if (x % 5 === 0 && x % 2 !== 0 && y % 5 === 0 && y % 2 !== 0) {
        rooms.push(`E${x}N${y}`);
        rooms.push(`W${x}N${y}`);
        rooms.push(`E${x}S${y}`);
        rooms.push(`W${x}S${y}`);
      }
    }
  }

  return rooms;
}

function updateCacheIfRequired() {
  if (Date.now() - roomsCache.lastUpdate < 1000 * 600) return;

  if (fs.existsSync(`files/users.json`)) {
    const rooms = fs.readFileSync(`files/users.json`);
    roomsCache.data = JSON.parse(rooms);
  }
  roomsCache.lastUpdate = Date.now();
}

export function GetRoomTotal(shards, type) {
  let total = 0;
  Object.values(shards).forEach((rooms) => {
    switch (type) {
      case "owned":
      case "reserved":
        total += rooms[type].length;
        break;
      case "total":
        total += rooms.owned.length + rooms.reserved.length;
        break;
      default:
        break;
    }
  });

  return total;
}

export function GetUserData(username) {
  updateCacheIfRequired();

  const user = roomsCache.data.find((user) => user.username === username);
  if (!user) return { shards: [] };
  return user
}

export function GetUsername(room, shard) {
  updateCacheIfRequired();

  const usernames = GetUsernames();

  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    const user = GetUserData(username);
    if (
      user.shards[shard] &&
      (user.shards[shard].owned.includes(room) ||
        user.shards[shard].reserved.includes(room))
    ) {
      return username;
    }
  }
}

export function GetUsernameById(id) {
  updateCacheIfRequired();

  const usernames = GetUsernames()
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    const user = GetUserData(username);
    if (user.id === id) {
      return username;
    }
  }
}

export function GetUsernames() {
  updateCacheIfRequired();

  return roomsCache.data.map((user) => user.username);
}
