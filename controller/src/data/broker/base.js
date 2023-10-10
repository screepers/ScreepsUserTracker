import * as dotenv from "dotenv";

import graphite from "graphite";
import postgres from 'postgres'
import { graphiteLogger as logger } from "../../logger.js";
import { GetShards } from "../helper.js";
import { GetUsernames } from "../../rooms/userHelper.js";
import handleUsers from "../handle/users.js";
import GetGameTime from "../screepsApi.js";

dotenv.config();

let sql = null;
if (process.env.POSTGRES_ENABLED === 'TRUE') sql = postgres({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: 'postgres',
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
})

const client = graphite.createClient(
  `plaintext://${process.env.GRAPHITE_HOST}/`
);

export default class BaseDataBroker {
  static users = {};

  static shards = GetShards();

  static tickRates = {};

  static async UploadStatus(ipStatus) {
    const start = Date.now();
    const usernames = GetUsernames();

    const stats = {};
    const handledUsernames = await handleUsers(usernames);
    Object.entries(handledUsernames).forEach(([username, userStats]) => {
      stats[username] = { info: userStats };
    });

    const liveTicks = {};
    for (let t = 0; t < this.shards.length; t += 1) {
      const shardName = this.shards[t];
      liveTicks[shardName] = await GetGameTime(shardName);
    }

    await this.Upload(
      {
        status: ipStatus,
        ticks: {
          live: liveTicks,
        },
        users: stats,
      },
      undefined,
      {
        start,
        type: "Status",
      }
    );
  }

  static AddRooms(username, shard, rooms) {
    if (!this.users[username]) {
      this.users[username] = {};
    }
    if (!this.users[username][shard]) {
      this.users[username][shard] = {};
    }

    // const knownRoomNames = Object.keys(this.users[username][shard]);
    // for (let kr = 0; kr < knownRoomNames.length; kr += 1) {
    //   const roomName = knownRoomNames[kr];
    //   if (!this.users[username][shard][roomName])
    //     delete this.users[username][shard][roomName];
    // }

    for (let r = 0; r < rooms.length; r += 1) {
      const roomName = rooms[r];
      if (!this.users[username][shard][roomName])
        this.users[username][shard][roomName] = 'noDataSet';
    }
  }

  static AddRoomData(username, shard, roomName, data) {
    if (!this.users[username]) return;
    if (!this.users[username][shard]) return;
    if (this.users[username][shard][roomName] === undefined) return;

    this.users[username][shard][roomName] = data;
    this.CheckUsers(username);
  }

  static async CheckUsers(username) {
    let hasMissingData = false;
    const shardsKeys = Object.keys(this.users[username]);
    for (let s = 0; s < shardsKeys.length; s += 1) {
      const shardName = shardsKeys[s];
      const roomsKeys = Object.keys(this.users[username][shardName]);
      for (let r = 0; r < roomsKeys.length; r += 1) {
        const roomName = roomsKeys[r];
        const roomData = this.users[username][shardName][roomName];
        if (roomData === 'noDataSet') hasMissingData = true;
      }
    }

    if (!hasMissingData) await this.UploadUsers(username);
  }

  static async Upload(data, timestamp, logInfo) {
    const graphiteQuery = new Promise((resolve) => {
      try {
        if (process.env.GRAPHITE_ONLINE !== "TRUE") resolve();
        else {
          const _timestamp = timestamp || Date.now();

          client.write(
            {
              [process.env.GRAPHITE_PREFIX || '']: {
                userTracker: { [process.env.SERVER_TYPE]: data },
              },
            },
            _timestamp,
            (err) => {
              if (err) {
                logger.error(err);
              } else if (logInfo)
                logger.info(
                  `Written data for ${logInfo.type}, took ${(
                    (Date.now() - logInfo.start) /
                    1000
                  ).toFixed(2)}s`
                );

              resolve();
            }
          );
        }
      } catch {
        resolve();
      }
    });

    // eslint-disable-next-line
    const postgresQuery = new Promise(async (resolve) => {
      try {
        if (process.env.POSTGRES_ENABLED !== 'TRUE') resolve();
        const shards = Object.keys(data.ticks.history);
        if (shards.length !== 1) resolve();
        const tick = Number(data.ticks.history[shards[0]]);
        const username = Object.keys(data.users)[0];

        await sql`
      INSERT INTO public.tickData ${sql({ data, tick, username }, 'data', 'tick', 'username')}`
      } catch (err) {
        resolve();
      }
    })

    return Promise.all([graphiteQuery, postgresQuery]);
  }
}
