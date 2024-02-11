import graphite from "graphite";
import postgres from 'postgres'
import { graphiteLogger as logger } from '../helper/logger.js'

let sql = null;
if (process.env.POSTGRES_ENABLED === 'TRUE') sql = postgres({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: 'screeps',
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
})

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
}

export async function UploadCombinedData(data, tick, username) {
  try {
    if (process.env.POSTGRES_ENABLED !== 'TRUE') return;
    await sql`
      INSERT INTO public.tick_data 
      ${sql({ data, tick, username }, 'data', 'tick', 'username')}`
  } catch (error) {
    logger.error(error)
  }
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
              `Written status`
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

export function UploadAdminUtils(data) {
  const graphiteQuery = new Promise((resolve) => {
    try {
      if (process.env.GRAPHITE_ONLINE !== "TRUE") resolve();
      else {
        client.write(
          {
            [process.env.GRAPHITE_PREFIX || '']: {
              userTracker: { [process.env.SERVER_TYPE]: { adminUtils: data } },
            },
          },
          Date.now(),
          (err) => {
            if (err) {
              logger.error(err);
            } else logger.info(
              `Written status`
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