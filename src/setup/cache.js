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
      roomsCache.lastUpdate = Date.now();
    }
    return roomsCache.data;
  }

  static async getUsersCache() {
    if (Cache.shouldUpdateCache('users')) {
      await Cache.updateUsersCache();
      usersCache.lastUpdate = Date.now();
    }
    return usersCache.data;
  }

  static async getUserRoomsCache() {
    if (Cache.shouldUpdateCache('userRooms')) {
      await Cache.updateUserRoomsCache();
      userRoomsCache.lastUpdate = Date.now();
    }
    return userRoomsCache.data;
  }

  static async getUserByIdCache() {
    if (Cache.shouldUpdateCache('userById')) {
      await Cache.updateUserByIdCache();
      userByIdCache.lastUpdate = Date.now();
    }
    return userByIdCache.data;
  }

  static async updateRoomsCache() {
    const userRooms = await Cache.getUserRoomsCache();
    const shards = {};
    const usernameKeys = Object.keys(userRooms);
    for (let s = 0; s < usernameKeys.length; s += 1) {
      const username = usernameKeys[s];

      const userShards = userRooms[username];
      const shardKeys = Object.keys(userShards);
      for (let r = 0; r < shardKeys.length; r += 1) {
        const shardName = shardKeys[r];

        const shardRooms = userShards[shardName];
        const roomTypeKeys = Object.keys(shardRooms);
        for (let rt = 0; rt < roomTypeKeys.length; rt += 1) {
          const roomType = roomTypeKeys[rt];
          const rooms = shardRooms[roomType];
          for (let i = 0; i < rooms.length; i += 1) {
            const roomName = rooms[i];
            if (!shards[shardName]) shards[shardName] = {};
            shards[shardName][roomName] = {
              username,
              type: roomType
            };
          }
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