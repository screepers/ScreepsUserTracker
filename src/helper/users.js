// eslint-disable-next-line import/no-cycle
let usersCache = [];
export function UpdateLocalUsersCache(cache) {
  usersCache = cache;
}

export function GetUserData(username) {
  const user = usersCache.find((u) => u.username === username);
  if (!user) return { shards: [] };
  return user;
}

// export function GetUsername(room, shard) {
//   const usernames = GetUsernames();

//   for (let u = 0; u < usernames.length; u += 1) {
//     const username = usernames[u];
//     const user = GetUserData(username);
//     if (
//       user.shards[shard] &&
//       (user.shards[shard].owned.includes(room) ||
//         user.shards[shard].reserved.includes(room))
//     ) {
//       return username;
//     }
//   }
// }