import fs from "fs";

const roomsCache = {
  data: {},
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
}

export function GetRoomTotal(shards, type = "owned") {
  let total = 0;
  Object.values(shards).forEach((rooms) => {
    switch (type) {
      case "owned":
        total += rooms.owned.length;
        break;
      case "reserved":
        total += rooms.reserved.length;
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
  updateCache();

  const rooms = roomsCache.data;
  if (!rooms[username]) return { shards: [] };

  return rooms[username];
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

  return Object.keys(roomsCache.data);
}
