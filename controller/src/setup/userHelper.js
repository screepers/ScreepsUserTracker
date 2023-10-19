import AdvancedScreepsApi from "screeps-advanced-api";
import fs from "fs";
import fs from "fs";
import Setup from ".";

let loginInfo = process.env.SCREEPS_TOKEN;
if (process.env.PRIVATE_SERVER_USERNAME) {
  loginInfo = {
    protocol: process.env.PRIVATE_SERVER_PROTOCOL,
    hostname: process.env.PRIVATE_SERVER_HOST,
    port: process.env.PRIVATE_SERVER_PORT,
    path: "/",
    username: process.env.PRIVATE_SERVER_USERNAME,
    password: process.env.PRIVATE_SERVER_PASSWORD
  }
}
const advancedScreepsApi = new AdvancedScreepsApi(loginInfo);
fs.mkdirSync("./files", { recursive: true });


function updateUserByIdCache() {
  const userById = Setup.userById;

}

function updateCacheIfRequired() {
  if (Date.now() - roomsCache.lastUpdate < 1000 * 600) return;

  if (fs.existsSync(`files/users.json`)) {
    const rooms = fs.readFileSync(`files/users.json`);
    roomsCache.data = JSON.parse(rooms);

    const users = Object.values(roomsCache.data);
    for (let u = 0; u < users.length; u += 1) {
      const user = users[u];
      roomsCache.userById[user.id] = user;
    }
  }
  roomsCache.lastUpdate = Date.now();
}

export function GetRoomTotal(shards, type) {
  let total = 0;
  const shardNames = Object.keys(shards);
  for (let s = 0; s < shardNames.length; s++) {
    const shardName = shardNames[s];
    const rooms = shards[shardName];
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
  };

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

export async function UpdateRooms() {
  try {
    const forcedUsers = process.env.USERNAMES.length > 0 ? process.env.USERNAMES.split(",") : [];
    let users = await advancedScreepsApi.getAllUsers()
    users = users.filter(forcedUsers.length > 0 ? (user) => forcedUsers.includes(user.username) : () => true);
    users.sort((a, b) => GetRoomTotal(b.shards, 'type') - GetRoomTotal(a.shards, 'type'));

    fs.writeFileSync("./files/users.json", JSON.stringify(users, null, 2));
  } catch (error) {
    logger.error(error);
  }
}