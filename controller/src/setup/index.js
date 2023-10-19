import AdvancedScreepsApi from "screeps-advanced-api";
import fs from "fs";
import { CronJob } from "cron";
const debug = process.env.DEBUG === "TRUE"

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


function roomCount(shards) {
  let count = 0;
  const shardNames = Object.keys(shards);
  for (let s = 0; s < shardNames.length; s++) {
    const shardName = shardNames[s];
    const owned = shards[shardName].owned;
    count += owned.length;
  }
  return count;
}

async function UpdateRooms() {
  try {
    const forcedUsers = process.env.USERNAMES.length > 0 ? process.env.USERNAMES.split(",") : [];
    let users = await advancedScreepsApi.getAllUsers()
    users = users.filter(forcedUsers.length > 0 ? (user) => forcedUsers.includes(user.username) : () => true);
    users.sort((a, b) => roomCount(b.shards) - roomCount(a.shards));

    fs.writeFileSync("./files/users.json", JSON.stringify(users, null, 2));
  } catch (error) {
    logger.error(error);
  }
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