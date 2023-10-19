import { CronJob } from "cron";
const debug = process.env.DEBUG === "TRUE"
import { cleanSource } from "../helper";

const baseCache = {
  data: {},
  lastUpdate: 0,
}
const roomsCache = cleanSource(baseCache)
const usersCache = cleanSource(baseCache)
const userRoomsCache = cleanSource(baseCache)
const userByIdCache = cleanSource(baseCache)

function getCacheData(type) {
  let cache = {}
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
  if (!shouldUpdate) return cache.data;
  cache.lastUpdate = Date.now();
  switch (type) {
    case 'rooms':
      break;
    case 'users':
      break;
    case 'userRooms':
      break;
    case 'userById':
      break;
    default:
      break;
  }
  return cache.data;
}

export default class Setup {
  constructor() {
    UpdateRooms();
  }


  static get rooms() { return getCacheData('rooms') };
  static get users() { return getCacheData('users') };
  static get userRooms() { return getCacheData('userRooms') };
  static get userById() { return getCacheData('userById') };
}

UpdateRooms();
const initialRoomUpdaterJob = new CronJob(
  debug ? "*/10 * * * *" : "0 * * * *",
  UpdateRooms,
  null,
  false,
  "Europe/Amsterdam"
);
initialRoomUpdaterJob.start();