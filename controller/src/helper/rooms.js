// eslint-disable-next-line import/prefer-default-export
export function GetRoomTotal(shards, type) {
  let total = 0;
  const shardNames = Object.keys(shards);
  for (let s = 0; s < shardNames.length; s += 1) {
    const shardName = shardNames[s];
    const rooms = shards[shardName];
    switch (type) {
      case "owned":
      case "reserved":
        total += rooms[type].length;
        break;
      case "total":
        total += rooms.owned.length + rooms.reserved.length;
        break;
      default:
        break;
    }
  };

  return total;
}