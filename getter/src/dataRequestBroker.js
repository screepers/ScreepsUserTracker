import { GetRoomHistory } from "./screepsApi.js";
import { dataRequestBroker as logger } from "./logger.js";
import axios from "axios";

let proxies = [];
async function getProxies() {
  try {
    const proxiesResponse = await axios.get('https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=100', {
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
    return;
  }
}

let resultId = 0;

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
        proxies.forEach((proxy) => {
          this.executeSingle(proxy);
        })
      });
  }

  addDataRequests(dataRequests) {
    this.dataRequests = dataRequests.concat(this.dataRequests);
  }

  getDataRequest() {
    return this.dataRequests[0]
    // return this.dataRequests.shift();
  }

  getDataRequests(type) {
    if (!type) return [...this.dataRequests];
    return [...this.dataRequests.filter((dr) => dr.type === type)];
  }

  addDataResult(dataResult, dataRequest, force = false) {
    if (force) {
      this.dataResults.push({
        dataResult,
        dataRequest,
        id: (resultId += 1),
      });
      return;
    }

    const firstTickObjects = Object.values(dataResult.ticks).filter(
      (tl) => tl !== null
    )[0];
    if (
      !firstTickObjects ||
      !Object.values(firstTickObjects).find((obj) => obj.type === "controller")
    )
      return;

    this.dataResults.push({ dataResult, dataRequest, id: (resultId += 1) });
  }

  resetDataResults(newData) {
    this.dataResults = [];
    // this.dataResults = newData;
  }

  getDataResultsToSend() {
    const toSend = this.dataResults.slice(0, 500);
    const dataResults = JSON.parse(JSON.stringify(toSend));
    this.resetDataResults(this.dataResults.slice(500));

    return dataResults;
  }

  getTotalDataResults() {
    return this.dataResults.length;
  }

  getTotalDataRequests() {
    return this.dataRequests.length;
  }

  async executeSingle(proxy) {
    const dataRequest = this.getDataRequest();
    if (!dataRequest) {
      await wait(100);
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
      this.addDataResult(
        dataResult.result,
        dataRequest,
        dataRequest.type !== "owned"
      );
    else {
      dataRequest.retries = dataRequest.retries
        ? (dataRequest.retries += 1)
        : 1;

      if (dataRequest.retries < 3) this.addDataRequests([dataRequest]);
      else if (dataResult.status === "Not found")
        this.addDataResult(dataResult.result, dataRequest, true);
      else
        logger.debug(
          `Failed to get data for ${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick} after 3 retries`
        );
    }
    return this.executeSingle(proxy);
  }
}
