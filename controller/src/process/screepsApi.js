import "dotenv/config";
import { ScreepsAPI } from "screeps-api";
import { apiLogger as logger } from "../helper/logger.js";

let path;
switch (process.env.SERVER_TYPE) {
  case "seasonal":
    path = "/season/";
    break;
  case "mmo":
  default:
    path = "/";
    break;
}

let api = new ScreepsAPI({
  token: process.env.SCREEPS_TOKEN,
  path,
});
if (process.env.PRIVATE_SERVER_USERNAME) {
  api = new ScreepsAPI({
    token: process.env.SCREEPS_TOKEN,
    protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
    hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
    port: process.env.PRIVATE_SERVER_PORT || 443,
    path,
  });
  await api.auth(
    process.env.PRIVATE_SERVER_USERNAME,
    process.env.PRIVATE_SERVER_PASSWORD
  );
}

function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const lastTickCache = {
}
export async function GetGameTime(shard) {
  try {
    if (lastTickCache[shard] && lastTickCache[shard].lastUpdate + 10 * 1000 > Date.now()) {
      return lastTickCache[shard].tick;
    }
    await sleep(500);

    const timeResult = await api.raw.game.time(shard);
    if (typeof timeResult !== "object" || !timeResult.ok)
      throw new Error(JSON.stringify(timeResult));
    logger.info(`TickApi: ${shard}/${timeResult.time}`);
    lastTickCache[shard] = {
      tick: timeResult.time,
      lastUpdate: Date.now(),
    }
    return lastTickCache[shard].tick;
  } catch (error) {
    logger.error(error);
    return undefined;
  }
}

async function getHistory(proxy, room, tick, shard) {
  if (!proxy) {
    const url = isPrivateServer ?
      `${baseHistoryPath}room-history?room=${room}&time=${tick}` :
      `${baseHistoryPath}room-history/${shard}/${room}/${tick}.json`;
    try {
      const response = await historyApi.raw.history(room, tick, shard);
      apiLogger.info(`Success: ${url}`);
      return { status: "Success", result: response };
    } catch (error) {
      if (error.message && error.message.includes("404 Not Found")) {
        apiLogger.info(`${url} / ${error.message}`)
        return { status: "Not found", result: null };
      }

      apiLogger.error(`${url} / ${error.stack}`)
      return { status: "Error" };
    }
  }

  const proxySettings = proxy;

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(resolve, 10 * 1000, () => {
      apiLogger.info('Failed: Timeout')
      return { status: "Timeout" }
    });
  });

  const getHistoryPromise = new Promise((resolve) => {

    const agent = new HttpsProxyAgent(
      `http://${proxySettings.username}:${proxySettings.password}@${proxySettings.proxy_address}:${proxySettings.port}`
    );
    const url = isPrivateServer ?
      `${baseHistoryPath}room-history?room=${room}&time=${tick}` :
      `${baseHistoryPath}room-history/${shard}/${room}/${tick}.json`;
    axios
      .get(url, {
        httpsAgent: agent,
      })
      .then((response) => {
        apiLogger.info(`Success: ${url}`)
        resolve({ status: "Success", result: response.data });
      })
      .catch((error) => {
        if (error.message && error.message.includes("404 Not Found")) {
          apiLogger.info(`${url} / ${error.message}`)
          resolve({ status: "Not found", result: null });
        }
        else {
          apiLogger.error(`${url} / ${error.stack}`)
          resolve({ status: "Error" });
        }
      });
  });

  const result = await Promise.race([timeoutPromise, getHistoryPromise]);
  return result;
}

export async function GetRoomHistory(proxy, shard, room, tick) {
  try {
    const historyResponse = await getHistory(proxy, room, tick, shard);
    if (historyResponse.status !== "Success") return historyResponse;
    const history = historyResponse.result;

    if (tick === 0) {
      history.ticks["0"] = history.ticks["1"];
      history.ticks["1"] = {};
    }

    return { status: "Success", data: history };
  } catch (error) {
    return { status: "Error" };
  }
}
