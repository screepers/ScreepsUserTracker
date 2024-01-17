import Cache from "../setup/cache.js";

export async function GetUsernameById(id) {
  const users = await Cache.getUserByIdCache();
  const user = users[id];
  if (user) return user.username;
}

let usersCache = [];
export function UpdateLocalUsersCache(cache) {
  usersCache = cache;
}

export async function GetUserData(username) {
  const user = usersCache.find((u) => u.username === username);
  if (!user) return { shards: [] };
  return user;
}

export async function GetUsernames() {
  const users = await Cache.getUserByIdCache();
  return users.map((user) => user.username);
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