import { ScreepsAPI } from "screeps-api";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

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
const baseHistoryPath = process.env.PRIVATE_SERVER_USERNAME ?
  `${process.env.PRIVATE_SERVER_PROTOCOL}://${process.env.PRIVATE_SERVER_HOST
  }:${process.env.PRIVATE_SERVER_PORT}${path}` : `https://screeps.com${path}`;

let historyApi = new ScreepsAPI({
  token: process.env.SCREEPS_TOKEN,
  path,
});
if (process.env.PRIVATE_SERVER_USERNAME) {
  historyApi = new ScreepsAPI({
    token: process.env.SCREEPS_TOKEN,
    protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
    hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
    port: process.env.PRIVATE_SERVER_PORT || 443,
    path,
  });
  await historyApi.auth(
    process.env.PRIVATE_SERVER_USERNAME,
    process.env.PRIVATE_SERVER_PASSWORD
  );
}

async function getHistory(proxy, room, tick, shard) {
  if (!proxy) {
    const response = await historyApi.raw.history(room, tick, shard);
    return { status: "Success", result: response };
  }

  const proxySettings = proxy;

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(resolve, 10 * 1000, { status: "Timeout" });
  });

  const getHistoryPromise = new Promise((resolve) => {
    const agent = new HttpsProxyAgent(
      `http://${proxySettings.username}:${proxySettings.password}@${proxySettings.proxy_address}:${proxySettings.port}`
    );
    try {
      const url = `${baseHistoryPath}room-history/${shard}/${room}/${tick}.json`;
      axios
        .get(url, {
          httpsAgent: agent,
        })
        .then((response) => {
          resolve({ status: "Success", result: response.data });
        })
        .catch((error) => {
          if (error.response && error.response.status === 404)
            resolve({ status: "Not found", result: null });
          resolve({ status: "Error" });
        });
    } catch (error) {
      if (error.message && error.message.includes("404 Not Found"))
        resolve({ status: "Not found", result: null });
      resolve({ status: "Error" });
    }
  });

  const result = await Promise.race([timeoutPromise, getHistoryPromise]);
  return result;
}

export default async function GetRoomHistory(proxy, shard, room, tick) {
  try {
    const historyResponse = await getHistory(proxy, room, tick, shard);
    if (historyResponse.status !== "Success") return historyResponse;
    const history = historyResponse.result;

    if (tick === 0) {
      history.ticks["0"] = history.ticks["1"];
      history.ticks["1"] = {};
    }

    return { status: "Success", result: history };
  } catch (error) {
    return { status: "Error" };
  }
}
