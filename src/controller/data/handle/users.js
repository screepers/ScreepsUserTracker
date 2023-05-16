import GetRooms from "../../rooms/userHelper.js";
import { BaseShards }from "./helper.js";

function handleUser(username) {
  const user = GetRooms(username);
  const stats = {};

  const { rooms, total } = user;
  BaseShards.forEach((shard) => {
    if (rooms[shard]) {
      const { owned, reserved } = rooms[shard];
      stats[shard] = {
        total: owned.length + reserved.length,
        owned: owned.length,
        reserved: reserved.length,
      };
    }
    else {
      stats[shard] = {
        total: 0,
        owned: 0,
        reserved: 0,
      }
      
    }
  });
  stats.ownedTotal = total;

  return stats;
}

export default function handleUsers(usernames) {
  const stats = {};
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    stats[username] = handleUser(username);
  }

  return stats;
}
