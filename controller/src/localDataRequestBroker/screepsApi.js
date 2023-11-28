import { ScreepsAPI } from "screeps-api";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { apiLogger } from "../helper/logger.js";

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

const isPrivateServer = !!process.env.PRIVATE_SERVER_USERNAME;
let historyApi = new ScreepsAPI({
  token: process.env.SCREEPS_TOKEN,
  path,
});
if (isPrivateServer) {
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
