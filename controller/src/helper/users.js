export function GetUsernameById(id) {
  updateCacheIfRequired();

  const user = roomsCache.userById[id];
  if (user) return user.username;
}