import GetRooms from "../../rooms/userHelper.js";

function handleUser(username) {
  const user = GetRooms(username);
  const stats = {};

  const { rooms, total } = user;
  Object.entries(rooms).forEach(([shard, data]) => {
    const { owned, reserved } = data;
    stats[shard] = {
      total: owned.length + reserved.length,
      owned: owned.length,
      reserved: reserved.length,
    };
  });
  stats.ownedTotal = total;

  return stats;
}

export default function handleUsers(usernames) {
  const stats = {};
  for (let u = 0; u < usernames.length; u++) {
    const username = usernames[u];
    stats[username] = handleUser(username);
  }

  return stats;
}
