import "dotenv/config";
import { GetRoomHistory } from "./screepsApi.js";
import { dataRequestBroker as logger } from "./logger.js";
import axios from "axios";
import io from 'socket.io-client'
const controllerIp = process.env.CONTROLLER_IP;
const websocket = io(`ws://${controllerIp.replace('http://', '').replace('https://', '')}`, { cookie: false });

let proxies = [];
async function getProxies() {
  try {
    const proxiesResponse = await axios.get(`https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=${process.env.WEBSHARE_PROXYAMOUNT}`, {
      headers: {
        Authorization: `Token ${process.env.WEBSHARE_TOKEN}`
      }
    });

    // proxies = proxiesResponse.data.results.filter(p => p.country_code === "DE");
    proxies = proxiesResponse.data.results;
    console.log(`Loaded ${proxies.length} proxies`)
    return proxies;
  } catch (error) {
    console.log(`Failed to load proxies: ${error.message}`)
    return [];
  }
}

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class DataRequestBroker {
  dataRequests = [];

  dataResults = [];

  constructor() {
    getProxies()
      .then((proxies) => {
        if (proxies.length === 0) {
          this.executeSingle(null);
        }
        proxies.forEach((proxy) => {
          this.executeSingle(proxy);
        })
      });
  }

  async getDataRequest() {
    const timeout = new Promise((resolve) => {
      setTimeout(resolve, 5000, null);
    });
    const getRequest = new Promise((resolve) => {
      websocket.emit('request');
      websocket.on('request', (data) => {
        const dataRequest = JSON.parse(data);
        resolve(dataRequest);
      })
    });

    const request = await Promise.race([timeout, getRequest])
    return request;
  }

  sendDataResult(dataResult, dataRequest, force = false) {
    let data = {
      dataResult,
      dataRequest,
    }
    if (!force) {
      const firstTickObjects = Object.values(dataResult.ticks).filter(
        (tl) => tl !== null
      )[0];
      if (
        !firstTickObjects ||
        !Object.values(firstTickObjects).find((obj) => obj.type === "controller")
      )
        return;
    }

    websocket.emit('data', JSON.stringify(data));
  }

  async executeSingle(proxy, forceDataRequest = null) {
    const dataRequest = forceDataRequest || await this.getDataRequest();
    if (!dataRequest) {
      await wait(10 * 1000);
      return this.executeSingle(proxy);
    }

    const { shard } = dataRequest;
    const { room } = dataRequest;
    const { tick } = dataRequest;

    const dataResult = await GetRoomHistory(proxy, shard, room, tick);
    if (dataResult.status === "Success")
      logger.debug(`Got data for ${shard}/${room}/${tick}`);
    else logger.debug(`Failed to get data for ${shard}/${room}/${tick}`);

    if (dataResult.status === "Success")
      this.sendDataResult(
        dataResult.result,
        dataRequest,
        dataRequest.type !== "owned"
      );
    else {
      dataRequest.retries = dataRequest.retries
        ? (dataRequest.retries += 1)
        : 1;

      if (dataRequest.retries < 3) return this.executeSingle(proxy, dataRequest);
      else if (dataResult.status === "Not found")
        this.sendDataResult(dataResult.result, dataRequest, true);
      else
        logger.debug(
          `Failed to get data for ${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick} after 3 retries`
        );
    }
    return this.executeSingle(proxy);
  }
}
