import { GetRoomTotal } from "../helper/rooms.js"

function groupBy(acc, value) {

  if (acc === null || value === null) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const innerValue = value[i];
      const typeOfValue = typeof innerValue;
      if (acc[i] === undefined) acc[i] = innerValue;

      if (typeOfValue === "number") {
        acc[i] += innerValue;
      }
      else groupBy(acc[i], innerValue, acc, value);
    }
  } else if (typeof value === "object") {
    const valueKeys = Object.keys(value);
    for (let i = 0; i < valueKeys.length; i += 1) {
      const key = valueKeys[i];
      const innerValue = value[key];
      if (acc[key] === undefined) {
        acc[key] = innerValue;
      }
      else {
        const typeOfValue = typeof innerValue;
        if (typeOfValue === "number") {
          acc[key] += innerValue;
        }
        else groupBy(acc[key], innerValue, acc, value);
      }
    }
  }
}

export default function handleCombinedRoomStats(shardsData, userData) {
  const stats = {};
  function getStatsObject() {
    return {
      shards: shardsData,
      combined: {
        shards: {},
      },
      userData
    };
  }

  const userStats = getStatsObject();
  const shardNames = Object.keys(shardsData);

  for (let i = 0; i < shardNames.length; i += 1) {
    const shardName = shardNames[i];
    const rooms = shardsData[shardName];
    if (!userStats.combined.shards[shardName]) userStats.combined.shards[shardName] = {};

    const roomKeys = Object.keys(rooms);
    for (let j = 0; j < roomKeys.length; j += 1) {
      const roomName = roomKeys[j];
      const roomStats = rooms[roomName];
      groupBy(
        userStats.combined.shards[shardName],
        JSON.parse(JSON.stringify(roomStats)),
        {
          base: stats[shardName],
          roomStats,
        }
      );
    }
  }

  function getAveragedStatsObject() {
    return {
      spawning: {
        spawnUptimePercentage: 0,
      },
    }
  }

  userStats.averaged = {
    shards: {},
  };

  for (let s = 0; s < shardNames.length; s += 1) {
    const shardName = shardNames[s];
    const shardData = shardsData[shardName];
    userStats.averaged.shards[shardName] = getAveragedStatsObject();

    const roomNames = Object.keys(shardData);
    const ownedRoomCount = GetRoomTotal(userData.shards, 'owned');
    for (let r = 0; r < roomNames.length; r += 1) {
      const roomName = roomNames[r];

      const isOwned = userStats.shards[shardName][roomName].spawning !== undefined;
      if (isOwned) {
        userStats.averaged.shards[shardName].spawning.spawnUptimePercentage +=
          userStats.shards[shardName][roomName].spawning.spawnUptimePercentage / ownedRoomCount;
      }
    }
  }

  if (process.env.ONLY_COMBINED_DATA_UPLOAD === "true")
    delete userStats.shards;

  return { stats: userStats }
}
