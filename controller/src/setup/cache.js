import AdvancedScreepsApi from "screeps-advanced-api";
import fs from "fs";
import { cleanSource } from "../helper/index.js";
import { GetRoomTotal } from "../helper/rooms.js";

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

const baseCache = {
  data: {},
  lastUpdate: 0,
}

const roomsCache = cleanSource(baseCache)
const usersCache = cleanSource(baseCache)
const userRoomsCache = cleanSource(baseCache)
const userByIdCache = cleanSource(baseCache)

export default class Cache {
  static shouldUpdateCache(type) {
    let cache;
    switch (type) {
      case 'rooms':
        cache = roomsCache;
        break;
      case 'users':
        cache = usersCache;
        break;
      case 'userRooms':
        cache = userRoomsCache;
        break;
      case 'userById':
        cache = userByIdCache;
        break;
      default:
        break;
    }

    const shouldUpdate = Date.now() - cache.lastUpdate > 1000 * 60;
    return shouldUpdate;
  }

  static async getRoomsCache() {
    if (Cache.shouldUpdateCache('rooms')) {
      await Cache.updateRoomsCache();
    }
    return roomsCache.data;
  }

  static async getUsersCache() {
    if (Cache.shouldUpdateCache('users')) {
      await Cache.updateUsersCache();
    }
    return usersCache.data;
  }

  static async getUserRoomsCache() {
    if (Cache.shouldUpdateCache('userRooms')) {
      await Cache.updateUserRoomsCache();
    }
    return userRoomsCache.data;
  }

  static async getUserByIdCache() {
    if (Cache.shouldUpdateCache('userById')) {
      await Cache.updateUserByIdCache();
    }
    return userByIdCache.data;
  }

  static async updateRoomsCache() {
    const userRooms = await Cache.getUserRoomsCache();
    const shards = {};
    const usernameKeys = Object.keys(userRooms);
    for (let s = 0; s < usernameKeys.length; s += 1) {
      const username = usernameKeys[s];
      const shards = userRooms[username];
      const shardKeys = Object.keys(shards);
      for (let r = 0; r < shardKeys.length; r += 1) {
        const shardName = shardKeys[r];
        const shard = shards[shardName];
        const shardRooms = shard.rooms;
        const roomKeys = Object.keys(shardRooms);
        for (let i = 0; i < roomKeys.length; i += 1) {
          const roomName = roomKeys[i];
          const room = {}
          room.username = username;
          room.shard = shardName;
          room.type = shard.type;
          shards[roomName] = room;
        }
      }
    }

    roomsCache.data = shards;
  }

  static async updateUsersCache() {
    const forcedUsers = process.env.USERNAMES.length > 0 ? process.env.USERNAMES.split(",") : [];
    let users = await advancedScreepsApi.getAllUsers()
    users = users.filter(forcedUsers.length > 0 ? (user) => forcedUsers.includes(user.username) : () => true);
    users.sort((a, b) => GetRoomTotal(b.shards, 'type') - GetRoomTotal(a.shards, 'type'));

    fs.writeFileSync("./files/users.json", JSON.stringify(users, null, 2));
    usersCache.data = users;
  }

  static async updateUserRoomsCache() {
    const users = await Cache.getUsersCache();
    const userRooms = {};
    for (let u = 0; u < users.length; u += 1) {
      const user = users[u];
      userRooms[user.username] = user.shards;
    }

    userRoomsCache.data = userRooms;
  }

  static async updateUserByIdCache() {
    const userById = {};

    const users = await this.getUsersCache();
    const userValues = Object.values(users);
    for (let u = 0; u < userValues.length; u += 1) {
      const user = userValues[u];
      userById[user.id] = user;
    }
    userByIdCache.data = userById;
  }
}