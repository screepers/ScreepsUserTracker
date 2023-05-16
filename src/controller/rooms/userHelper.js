import fs from "fs";

export default function GetRooms(username) {
  if (
    !fs.existsSync(`files/users.json`) ||
    !fs.existsSync(`files/userRoomsCount.json`)
  )
    return {};

  const rooms = fs.readFileSync(`files/users.json`);
  const userRoomsCount = fs.readFileSync(`files/userRoomsCount.json`);

  const parsedRooms = JSON.parse(rooms);
  const parsedUserRoomsCount = JSON.parse(userRoomsCount);

  return {
    rooms: parsedRooms[username].shards,
    total: parsedUserRoomsCount.find((u) => u[0] === username)[1],
  };
}

export function GetUsername(room, shard) {
  if (!fs.existsSync(`files/users.json`)) return null;

  const rooms = fs.readFileSync(`files/users.json`);
  const parsedRooms = JSON.parse(rooms);

  const usernames = Object.keys(parsedRooms);
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    const data = parsedRooms[username];
    if (
      data.shards[shard] &&
      (data.shards[shard].owned.includes(room) ||
        data.shards[shard].reserved.includes(room))
    ) {
      return username;
    }
  }
}

export function GetUsernameById(id) {
  if (!fs.existsSync(`files/users.json`)) return null;

  const rooms = fs.readFileSync(`files/users.json`);
  const parsedRooms = JSON.parse(rooms);

  const usernames = Object.keys(parsedRooms);
  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    const data = parsedRooms[username];
    if (data.id === id) {
      return username;
    }
  }
}

export function GetUsernames() {
  if (
    !fs.existsSync(`files/users.json`) ||
    !fs.existsSync(`files/userRoomsCount.json`)
  )
    return [];

  const userRoomsCount = fs.readFileSync(`files/userRoomsCount.json`);

  const parsedUserRoomsCount = JSON.parse(userRoomsCount);

  return parsedUserRoomsCount.map((u) => u[0]);
}
