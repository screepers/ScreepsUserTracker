import fs from "fs";

const roomsCache = {
  data: {},
  lastUpdate: 0,
};
const userRoomsCountCache = {
  data: [],
  lastUpdate: 0,
};

function updateCache() {
  if (Date.now() - roomsCache.lastUpdate > 1000 * 60) {
    if (fs.existsSync(`files/users.json`)) {
      const rooms = fs.readFileSync(`files/users.json`);
      roomsCache.data = JSON.parse(rooms);
    }
    roomsCache.lastUpdate = Date.now();
  }
  if (Date.now() - userRoomsCountCache.lastUpdate > 1000 * 60) {
    if (fs.existsSync(`files/userRoomsCount.json`)) {
      const userRoomsCount = fs.readFileSync(`files/userRoomsCount.json`);
      userRoomsCountCache.data = JSON.parse(userRoomsCount);
    }
    userRoomsCountCache.lastUpdate = Date.now();
  }
}

export default function GetRooms(username) {
  updateCache();

  const rooms = roomsCache.data;
  const userRoomsCount = userRoomsCountCache.data;

  if (!rooms[username]) return { rooms: [], total: 0 };

  return {
    rooms: rooms[username].shards,
    total: userRoomsCount.find((u) => u[0] === username)[1],
  };
}

export function GetUsername(room, shard) {
  updateCache();

  const rooms = roomsCache.data;

  const usernames = Object.keys(rooms);
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    const data = rooms[username];
    if (
      data.shards[shard] &&
      (data.shards[shard].owned.includes(room) ||
        data.shards[shard].reserved.includes(room))
    ) {
      return username;
    }
  }
}

export function GetUsernameById(id) {
  updateCache();

  const rooms = roomsCache.data;

  const usernames = Object.keys(rooms);
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    const data = rooms[username];
    if (data.id === id) {
      return username;
    }
  }
}

export function GetUsernames() {
  updateCache();

  return userRoomsCountCache.data.map((u) => u[0]);
}
