import graphite from "graphite";
import { graphiteLogger as logger } from '../helper/logger.js'
// import postgres from 'postgres'

// let sql = null;
// if (process.env.POSTGRES_ENABLED === 'TRUE') sql = postgres({
//   host: process.env.POSTGRES_HOST,
//   port: process.env.POSTGRES_PORT,
//   database: 'postgres',
//   username: process.env.POSTGRES_USER,
//   password: process.env.POSTGRES_PASSWORD,
// })

const client = graphite.createClient(
  `plaintext://${process.env.GRAPHITE_HOST}/`
);


export default function UploadStats(data, timestamp) {
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
            } else logger.info(
              `Written data`
            );

            resolve();
          }
        );
      }
    } catch {
      resolve();
    }
  });
  return Promise.all([graphiteQuery]);

  // eslint-disable-next-line
  // const postgresQuery = new Promise(async (resolve) => {
  //   try {
  //     if (process.env.POSTGRES_ENABLED !== 'TRUE') resolve();
  //     const shards = Object.keys(data.ticks.history);
  //     if (shards.length !== 1) resolve();
  //     const tick = Number(data.ticks.history[shards[0]]);
  //     const username = Object.keys(data.users)[0];

  //     await sql`
  //     INSERT INTO public.tickData ${sql({ data, tick, username }, 'data', 'tick', 'username')}`
  //   } catch (err) {
  //     resolve();
  //   }
  // })

  // return Promise.all([graphiteQuery, postgresQuery]);
}

export function UploadStatus(data) {
  const graphiteQuery = new Promise((resolve) => {
    try {
      if (process.env.GRAPHITE_ONLINE !== "TRUE") resolve();
      else {
        client.write(
          {
            [process.env.GRAPHITE_PREFIX || '']: {
              userTracker: { [process.env.SERVER_TYPE]: { status: data } },
            },
          },
          Date.now(),
          (err) => {
            if (err) {
              logger.error(err);
            } else logger.info(
              `Written data`
            );

            resolve();
          }
        );
      }
    } catch {
      resolve();
    }
  });
  return Promise.all([graphiteQuery]);
}