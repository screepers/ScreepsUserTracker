import { CronJob } from "cron";
import Cache from "./cache.js";

const debug = process.env.DEBUG === "TRUE"

export default class Setup {
  static async init() {
    await Cache.updateUsersCache();
    Cache.updateRoomsCache();
    Cache.updateUserRoomsCache();
    Cache.updateUserByIdCache();
  }
}

// UpdateRooms();
// const initialRoomUpdaterJob = new CronJob(
//   debug ? "*/10 * * * *" : "0 * * * *",
//   UpdateRooms,
//   null,
//   false,
//   "Europe/Amsterdam"
// );
// initialRoomUpdaterJob.start();