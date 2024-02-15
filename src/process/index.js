import { GetRoomHistory } from "./screepsApi.js";
import { sleep } from "../helper/index.js";
import getProxy from "../helper/proxy.js";
import { GetUsernameById } from "../helper/users.js";
import ProcessDataBroker from "../data/broker/processData.js";

const validData = {}
function shouldFail(opts) {
  const key = `${opts.shard}-${opts.room}`
  const data = validData[key]
  if (!data) return false;

  if (data.tick + 1000 > opts.tick) return false
  delete validData[key]
  return true;
}

const lastRequest = {}
async function waitMax500ms(proxyIndex = -1) {
  const last = lastRequest[proxyIndex] || 0;
  const diff = Date.now() - last;
  lastRequest[proxyIndex] = Date.now();
  const sleepTime = Math.min(500 - diff, 500);
  if (sleepTime < 0) Promise.resolve();
  return sleep(sleepTime);
}

export default async function processData(opts, proxyIndex) {
  await waitMax500ms(proxyIndex);
  let proxy = null;
  if (proxyIndex !== undefined) {
    proxy = await getProxy(proxyIndex);
  }

  const dataResult = await GetRoomHistory(proxy, opts.shard, opts.room, opts.tick);
  if (dataResult.status === "Success") {
    const { data } = dataResult;
    if (opts.username) {
      opts.timestamp = data.timestamp;
      if (opts.username === "Unknown") {
        const userIds = {};
        const tick = Object.values(data.ticks)[0];
        if (tick) {
          const tickObjects = Object.values(tick);
          for (let i = 0; i < tickObjects.length; i += 1) {
            const tickData = tickObjects[i];
            if (tickData.controller) {
              opts.userId = tickData.controller.user;
              opts.username = await GetUsernameById(opts.userId);
              opts.type = "owned"
              break;
            }
            if (tickData.reservation) {
              opts.userId = tickData.reservation.user;
              opts.username = await GetUsernameById(opts.userId);
              opts.type = "reserved"
              break;
            }
            if (tickData.user) {
              userIds[tickData.user] = userIds[tickData.user] || 0;
              userIds[tickData.user] += 1;
            }
          }

          if (opts.username === "Unknown") {
            let max = 0;
            let maxId = "Unknown";
            const userIdsKeys = Object.keys(userIds);
            for (let u = 0; u < userIdsKeys.length; u += 1) {
              const id = userIdsKeys[u];
              if (userIds[id] > max) {
                max = userIds[id];
                maxId = id;
              }
            }

            opts.userId = maxId;
            opts.username = await GetUsernameById(maxId);
          }
        }

        if (!opts.username || opts.username === "Unknown") {
          return {
            status: "No user",
          }
        }
      }

      opts.data = await ProcessDataBroker.single({ roomData: data, opts });
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

    opts.data = validData[`${opts.shard}-${opts.room}`] || {};
    return {
      status: "Success",
    };
  }

  opts.failed = true;
  return processData(opts, proxyIndex);
}