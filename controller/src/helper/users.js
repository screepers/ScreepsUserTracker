export function GetUsernameById(id) {
  const user = roomsCache.userById[id];
  if (user) return user.username;
}

export function GetUserData(username) {
  const user = roomsCache.data.find((u) => u.username === username);
  if (!user) return { shards: [] };
  return user;
}

export function GetUsernames() {
  return roomsCache.data.map((user) => user.username);
}

export function GetUsername(room, shard) {
  const usernames = GetUsernames();

  for (let u = 0; u < usernames.length; u += 1) {
    const username = usernames[u];
    const user = GetUserData(username);
    if (
      user.shards[shard] &&
      (user.shards[shard].owned.includes(room) ||
        user.shards[shard].reserved.includes(room))
    ) {
      return username;
    }
  }
}