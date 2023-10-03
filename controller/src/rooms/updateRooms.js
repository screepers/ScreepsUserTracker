import fs from "fs";
import AdvancedScreepsApi from "screeps-advanced-api";
import { ownedLogger as logger } from "../logger.js";

const advancedScreepsApi = new AdvancedScreepsApi(process.env.SCREEPS_TOKEN);

fs.mkdirSync("./files", { recursive: true });

function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function roomCount(shards) {
  let count = 0;
  Object.values(shards).forEach(({ owned }) => {
    count += owned.length;
  });
  return count;
}

async function UpdateRooms() {
  try {
    const forcedUsers = process.env.USERNAMES.split(",");
    let users = (await advancedScreepsApi.getAllUsers())
    users = users.filter(forcedUsers.length > 0 ? (user) => forcedUsers.includes(user.username) : () => true);
    users.sort((a, b) => roomCount(b.shards) - roomCount(a.shards));

    fs.writeFileSync("./files/users.json", JSON.stringify(users));
    await sleep(30 * 1000);
  } catch (error) {
    if (error.message && error.message.startsWith("Rate limit exceeded"))
      return;
    logger.error(error);
  }
}

export default UpdateRooms;
