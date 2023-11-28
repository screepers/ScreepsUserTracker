import Cache from "../setup/cache.js";

export async function getCycle(tick) {
  const shards = Cache.getRoomsCache();
  const cycle = [];

  const shardNames = Object.keys(shards);
  for (let s = 0; s < shardNames.length; s += 1) {
    const shardName = shardNames[s];
    const shardRooms = shards[shardName];
    const roomNames = Object.keys(shardRooms);
    for (let r = 0; r < roomNames.length; r += 1) {
      const roomName = roomNames[r];
      const room = shardRooms[roomName];
      cycle.push({
        shard: shardName,
        room: roomName,
        username: room.username,
        type: room.type,
        tick,
      });
    }
  }

  return cycle;
}

export function cycleStatus(cycle) {
  const status = {
    processed: [],
    queued: [],
  };
  for (let i = 0; i < cycle.length; i += 1) {
    const { data } = cycle[i];
    if (data) status.processed.push(data);
    else status.queued.push(cycle[i]);
  }
  return status;
}