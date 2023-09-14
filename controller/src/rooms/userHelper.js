import fs from "fs";

const roomsCache = {
  data: {},
  lastUpdate: 0,
};

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

  const user = roomsCache.data.find((u) => u.username === username);
  if (!user) return { shards: [] };
  return user;
}

export function GetUsernames() {
  updateCacheIfRequired();

  return roomsCache.data.map((user) => user.username);
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

  const usernames = GetUsernames();
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    const user = GetUserData(username);
    if (user.id === id) {
      return username;
    }
  }
}
