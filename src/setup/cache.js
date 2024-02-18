import AdvancedScreepsApi from "screeps-advanced-api";
import fs from "fs";
import { cleanSource } from "../helper/index.js";
import { GetRoomTotal } from "../helper/rooms.js";
import { cacheLogger as logger } from "../helper/logger.js";
// eslint-disable-next-line
import { UpdateLocalUsersCache } from "../helper/users.js";
import ProcessDataBroker from "../data/broker/processData.js";

let loginInfo = process.env.SCREEPS_TOKEN;
const settings = process.env.API_SETTINGS ? JSON.parse(process.env.API_SETTINGS) : {};
if (process.env.PRIVATE_SERVER_USERNAME) {
  loginInfo = {
    protocol: process.env.PRIVATE_SERVER_PROTOCOL,
    hostname: process.env.PRIVATE_SERVER_HOST,
    port: process.env.PRIVATE_SERVER_PORT,
    path: "/",
    username: process.env.PRIVATE_SERVER_USERNAME,
    password: process.env.PRIVATE_SERVER_PASSWORD,
  }
}
const advancedScreepsApi = new AdvancedScreepsApi(loginInfo, settings);
fs.mkdirSync("./files", { recursive: true });

const baseCache = {
  data: {},
  lastUpdate: 0,
  isUpdating: false,
}

const roomsCache = cleanSource(baseCache)
const usersCache = cleanSource(baseCache)
const userRoomsCache = cleanSource(baseCache)
const userByIdCache = cleanSource(baseCache)

export default class Cache {
  static shouldUpdateCache(type) {
    let cache;
    const shouldUpdateInterval = 1000 * 60 * 30;
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
      default:
        break;
    }

    return Date.now() - cache.lastUpdate > shouldUpdateInterval;
  }

  static async getRoomsCache() {
    if (Cache.shouldUpdateCache('rooms')) {
      if (roomsCache.isUpdating) return roomsCache.data;
      roomsCache.isUpdating = true;
      logger.info('Updating rooms cache');
      await Cache.updateRoomsCache();
      roomsCache.lastUpdate = Date.now();
      roomsCache.isUpdating = false;
    }
    logger.info('Returning rooms cache');
    return roomsCache.data;
  }

  static async getUsersCache() {
    if (Cache.shouldUpdateCache('users')) {
      if (usersCache.isUpdating) return usersCache.data;
      usersCache.isUpdating = true;
      logger.info('Updating users cache');
      await Cache.updateUsersCache();
      usersCache.lastUpdate = Date.now();
      usersCache.isUpdating = false;
    }
    logger.info('Returning users cache');
    return usersCache.data;
  }

  static async getUserRoomsCache() {
    if (Cache.shouldUpdateCache('userRooms')) {
      if (userRoomsCache.isUpdating) return userRoomsCache.data;
      userRoomsCache.isUpdating = true;
      logger.info('Updating userRooms cache');
      await Cache.updateUserRoomsCache();
      userRoomsCache.lastUpdate = Date.now();
      userRoomsCache.isUpdating = false;
    }
    logger.info('Returning userRooms cache');
    return userRoomsCache.data;
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
    const forcedUsers = process.env.USERNAMES && process.env.USERNAMES.length > 0
      ? process.env.USERNAMES.split(",") : [];
    let users = await advancedScreepsApi.getAllUsers()
    users = users.filter(forcedUsers.length > 0 ? (user) => forcedUsers.includes(user.username) : () => true);
    users.sort((a, b) => GetRoomTotal(b.shards, 'type') - GetRoomTotal(a.shards, 'type'));
    const userValues = Object.values(users);

    for (let u = 0; u < userValues.length; u += 1) {
      const user = userValues[u];
      ProcessDataBroker.usernamesById[user.id] = user.username;
    }
    fs.writeFileSync("./files/users.json", JSON.stringify(users, null, 2));
    UpdateLocalUsersCache(users);
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
}