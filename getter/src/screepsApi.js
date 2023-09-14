import "dotenv/config";
import { ScreepsAPI } from "screeps-api";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import settings from "./settings.js";

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
const baseHistoryPath = `${process.env.PRIVATE_SERVER_PROTOCOL || "https"}://${
  process.env.PRIVATE_SERVER_HOST || "screeps.com"
}:${process.env.PRIVATE_SERVER_PORT || 443}${path}`;

const historyApi = new ScreepsAPI({
  protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
  hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
  port: process.env.PRIVATE_SERVER_PORT || 443,
  path: "/",
});
if (process.env.PRIVATE_SERVER_USERNAME)
  await historyApi.auth(
    process.env.PRIVATE_SERVER_USERNAME,
    process.env.PRIVATE_SERVER_PASSWORD
  );

async function getHistory(proxy, room, tick, shard) {
  if (!proxy) {
    const response = await historyApi.raw.history(room, tick, shard);
    return { status: "Success", result: response };
  }

  const proxySettings = proxy;

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(resolve, 5000, { status: "Timeout" });
  });

  const getHistoryPromise = new Promise((resolve) => {
    const agent = new HttpsProxyAgent(
      `http://${proxySettings.username}:${proxySettings.password}@${proxySettings.proxy_address}:${proxySettings.port}`
    );
    try {
      axios
        .get(`${baseHistoryPath}room-history/${shard}/${room}/${tick}.json`, {
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
