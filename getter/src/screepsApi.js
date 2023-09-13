import "dotenv/config";
import { ScreepsAPI } from "screeps-api";
import settings from "./settings.js";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";


let path;
switch (settings.serverType) {
  case "seasonal":
    path = "/season/";
    break;
  case "mmo":
  default:
    path = "/";
    break;
}
const baseHistoryPath = `${process.env.PRIVATE_SERVER_PROTOCOL || "https"}://${process.env.PRIVATE_SERVER_HOST || "screeps.com"}:${process.env.PRIVATE_SERVER_PORT || 443}${path}`

async function getHistory(proxy, room, tick, shard) {
  if (!proxy) {
    const response = await historyApi.raw.history(room, tick, shard);
    return { status: "Success", result: response };
  }

  const proxySettings = proxy;

  const timeout = new Promise((resolve) => {
    setTimeout(resolve, 5000, { status: "Timeout" });
  });

  const getHistory = new Promise(async (resolve) => {
    const agent = new HttpsProxyAgent(`http://${proxySettings.username}:${proxySettings.password}@${proxySettings.proxy_address}:${proxySettings.port}`);
    try {
      const response = await axios.get(`${baseHistoryPath}room-history/${shard}/${room}/${tick}.json`, {
        httpsAgent: agent,
      })

      resolve({ status: "Success", result: response.data });
    } catch (error) {
      if (error.message && error.message.includes("404 Not Found"))
        resolve({ status: "Not found", result: null });
      resolve({ status: "Error" });
    }
  });

  const result = await Promise.race([timeout, getHistory])
  return result;
}

const historyApi = new ScreepsAPI({
  protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
  hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
  port: process.env.PRIVATE_SERVER_PORT || 443,
  path: "/",
});
if (process.env.PRIVATE_SERVER_USERNAME) await historyApi.auth(process.env.PRIVATE_SERVER_USERNAME, process.env.PRIVATE_SERVER_PASSWORD);

export async function GetRoomHistory(proxy, shard, room, tick) {
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