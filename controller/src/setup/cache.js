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

  static getRoomsCache() {
    if (Cache.shouldUpdateCache('rooms')) {
      Cache.updateRoomsCache();
    }
    return roomsCache.data;
  }

  static async getUsersCache() {
    if (Cache.shouldUpdateCache('users')) {
      await Cache.updateUsersCache();
    }
    return usersCache.data;
  }

  static getUserRoomsCache() {
    if (Cache.shouldUpdateCache('userRooms')) {
      Cache.updateUserRoomsCache();
    }
    return userRoomsCache.data;
  }

  static getUserByIdCache() {
    if (Cache.shouldUpdateCache('userById')) {
      Cache.updateUserByIdCache();
    }
    return userByIdCache.data;
  }

  static updateRoomsCache() {

  }

  static async updateUsersCache() {
    const forcedUsers = process.env.USERNAMES.length > 0 ? process.env.USERNAMES.split(",") : [];
    let users = await advancedScreepsApi.getAllUsers()
    users = users.filter(forcedUsers.length > 0 ? (user) => forcedUsers.includes(user.username) : () => true);
    users.sort((a, b) => GetRoomTotal(b.shards, 'type') - GetRoomTotal(a.shards, 'type'));

    fs.writeFileSync("./files/users.json", JSON.stringify(users, null, 2));
    usersCache.data = users;
  }

  static updateUserRoomsCache() {

  }

  static updateUserByIdCache() {
    const userById = {};

    const users = this.getUsersCache();
    const userValues = Object.values(users);
    for (let u = 0; u < userValues.length; u += 1) {
      const user = userValues[u];
      userById[user.id] = user;
    }
    userByIdCache.data = userById;
  }
}