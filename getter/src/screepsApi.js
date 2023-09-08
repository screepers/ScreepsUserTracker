import "dotenv/config";
import { ScreepsAPI } from "screeps-api";
import settings from "./settings.js";
import fs from "fs";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";


// #region temp

let averagedOverCountry = {};
let averagedOverCountryAndIp = {};
let total = 0;
let lastTotal = 0;

function averageResult(proxySettings, timeTaken) {
  if (!averagedOverCountry[proxySettings.country_code]) averagedOverCountry[proxySettings.country_code] = { total: 0, count: 0, perResult: 0 };
  averagedOverCountry[proxySettings.country_code].total += timeTaken;
  averagedOverCountry[proxySettings.country_code].count += 1;
  averagedOverCountry[proxySettings.country_code].perResult = averagedOverCountry[proxySettings.country_code].total / averagedOverCountry[proxySettings.country_code].count;

  if (!averagedOverCountryAndIp[proxySettings.country_code]) averagedOverCountryAndIp[proxySettings.country_code] = {};
  if (!averagedOverCountryAndIp[proxySettings.country_code][proxySettings.proxy_address]) averagedOverCountryAndIp[proxySettings.country_code][proxySettings.proxy_address] = { total: 0, count: 0, perResult: 0 };
  averagedOverCountryAndIp[proxySettings.country_code][proxySettings.proxy_address].total += timeTaken;
  averagedOverCountryAndIp[proxySettings.country_code][proxySettings.proxy_address].count += 1;
  averagedOverCountryAndIp[proxySettings.country_code][proxySettings.proxy_address].perResult = averagedOverCountryAndIp[proxySettings.country_code][proxySettings.proxy_address].total / averagedOverCountryAndIp[proxySettings.country_code][proxySettings.proxy_address].count;

  total += 1;
}
//#endregion

let lastProxyIndex = 0;
function getProxy() {
  if (lastProxyIndex === proxies.length) lastProxyIndex = 0;
  const proxy = proxies[lastProxyIndex];
  lastProxyIndex += 1;
  return proxy;
}

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
    return await historyApi.raw.history(room, tick, shard);
  }

  const start = Date.now();
  // const proxySettings = getProxy();
  const proxySettings = proxy;

  const timeout = new Promise((resolve, reject) => {
    setTimeout(resolve, 5000,);
  });

  const getHistory = new Promise(async (resolve, reject) => {
    const agent = new HttpsProxyAgent(`http://${proxySettings.username}:${proxySettings.password}@${proxySettings.proxy_address}:${proxySettings.port}`);
    // console.log(`Using proxy ${proxySettings.proxy_address}:${proxySettings.port}`)
    try {
      const response = await axios.get(`${baseHistoryPath}room-history/${shard}/${room}/${tick}.json`, {
        httpsAgent: agent,
      })

      const end = Date.now();
      // console.log(`History for ${room} at tick ${tick} fetched in ${end - start}ms`)
      averageResult(proxySettings, end - start);
      resolve({ history: response.data });
    } catch (error) {
      resolve();
    }
  });

  const result = await Promise.race([timeout, getHistory])
  return result;
  // Both resolve, but promise2 is faster
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
    if (!historyResponse) return { status: "Error" };
    const history = historyResponse.history;

    if (tick === 0) {
      history.ticks["0"] = history.ticks["1"];
      history.ticks["1"] = {};
    }

    return { status: "Success", result: history };
  } catch (error) {
    if (error.message && error.message.includes("404 Not Found"))
      return { status: "Not found", result: null };
    return { status: "Error" };
  }
}

setInterval(() => {
  console.log(`${(total - lastTotal) / 10} requests per second`)
  lastTotal = total;

  // averaged by country, give array of countries with average time, sorted by average time
  const averagedOverCountryArray = Object.keys(averagedOverCountry).map((key) => {
    return { country: key, ...averagedOverCountry[key] };
  }).sort((a, b) => a.perResult - b.perResult);
  let a = 1
}, 1000 * 10);