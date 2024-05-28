import { GetRoomHistory } from "./screepsApi.js";
import { sleep } from "../helper/index.js";
import getProxy from "../helper/proxies/index.js";
import ProcessDataBroker from "../data/broker/processData.js";

const validData = {}
function shouldFail(opts) {
  const key = `${opts.shard}-${opts.room}`
  const data = validData[key]
  if (!data) return false;

  if (data.tick + 2500 > opts.tick) return false
  delete validData[key]
  return true;
}

const lastRequest = {}
async function waitMax500ms(proxyIndex = -1) {
  const last = lastRequest[proxyIndex] || 0;
  const diff = Date.now() - last;
  lastRequest[proxyIndex] = Date.now();
  const sleepTime = Math.min(500 - diff, 500);
  if (sleepTime < 0) return Promise.resolve();
  return sleep(sleepTime);
}

export default async function processData(opts, proxyIndex) {
  await waitMax500ms(proxyIndex);
  let proxy = null;
  if (proxyIndex !== undefined) {
    proxy = await getProxy(proxyIndex);
  }

  const dataResult = await GetRoomHistory(proxy, opts.shard, opts.room, opts.tick);
  switch (dataResult.status) {
    case "Success": {
      const { data } = dataResult;
      if (opts.username) {
        opts.timestamp = data.timestamp;
        opts.data = await ProcessDataBroker.single({ roomData: data, opts });
        if (!opts.data) {
          return {
            status: "No user",
          }
        }
        validData[`${opts.shard}-${opts.room}`] = opts;
      }
      return {
        status: "Success",
      }
    }
    default: {
      if (shouldFail(opts)) {
        return {
          status: "Failed",
        };
      }

      opts.data = validData[`${opts.shard}-${opts.room}`];
      return {
        status: "Success"
      }
    }
  }
}