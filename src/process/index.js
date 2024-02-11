import { GetRoomHistory } from "./screepsApi.js";
import { sleep } from "../helper/index.js";
import getProxy from "../helper/proxy.js";
import { FixedThreadPool } from "poolifier";
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ProcessDataBroker from "../data/broker/processData.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let pool = null;
if (process.env.USE_MULTITHREADING_CORES) {
  pool = new FixedThreadPool(parseInt(process.env.USE_MULTITHREADING_CORES), __dirname + "/processThreadWorker.js",
    {
      errorHandler: (e) => {
        console.error(e);
      },
      onlineHandler: () => {
        console.log("A thread came online");
      }
    });
}

let validData = {}
function shouldFail(opts) {
  const key = `${opts.shard}-${opts.room}`
  const data = validData[key]
  if (!data) return false;

  if (data.tick + 1000 > opts.tick) return false
  delete validData[key]
  return true;
}

export default async function processData(opts, proxyIndex) {
  await sleep(500)
  let proxy = null;
  if (proxyIndex !== undefined) {
    proxy = await getProxy(proxyIndex);
  }
  const dataResult = await GetRoomHistory(proxy, opts.shard, opts.room, opts.tick);
  if (dataResult.status === "Success") {
    const { data } = dataResult;
    if (opts.username) {
      opts.timestamp = data.timestamp;
      if (process.env.USE_MULTITHREADING_CORES) {
        opts.data = await pool.execute({ roomData: data, opts });
      }
      else {
        opts.data = await ProcessDataBroker.single({ roomData: data, opts });
      }

      validData[`${opts.shard}-${opts.room}`] = { data: opts.data, tick: opts.tick }
    }
    return {
      status: "Success",
    }
  }
  if (opts.failed) {
    if (shouldFail(opts)) {
      return {
        status: "Failed",
      };
    }
    else {
      opts.data = validData[`${opts.shard}-${opts.room}`] || {};
      return {
        status: "Success",
      };
    }
  }

  opts.failed = true;
  return processData(opts, proxyIndex);
}