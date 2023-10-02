import io from "socket.io-client";
import { dataRequestBroker as logger } from "./logger.js";
import GetRoomHistory from "./screepsApi.js";

const controllerIp = process.env.CONTROLLER_IP;
const websocket = io(
  `ws://${controllerIp.replace("http://", "").replace("https://", "")}`,
  { cookie: false }
);

let count = 0;
let lastCount = 0;

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const speed = {};

export default class DataRequestBroker {
  dataRequests = [];

  dataResults = [];

  proxy;

  constructor(proxy = null) {
    this.proxy = proxy;
  }

  static async getDataRequest() {
    // if (this.dataRequests.length > 0) return this.dataRequests.shift();

    const timeout = new Promise((resolve) => {
      setTimeout(resolve, 60 * 1000, null);
    });
    const getRequest = new Promise((resolve) => {
      websocket.emit("request");
      websocket.on("request", (data) => {
        resolve(JSON.parse(data));
      });
    });

    // const dataRequests = await Promise.race([timeout, getRequest]);
    // this.dataRequests = dataRequests;
    // if (dataRequests.length === 0) return undefined;
    // return dataRequests.shift();

    const dataRequest = await Promise.race([timeout, getRequest]);
    return dataRequest;
  }

  static async emitData(data) {
    websocket.emit("data", JSON.stringify(data));
  }

  static sendDataResult(dataResult, dataRequest, force = false) {
    const data = {
      dataResult,
      dataRequest,
    };
    if (!force) {
      const firstTickObjects = Object.values(dataResult.ticks).filter(
        (tl) => tl !== null
      )[0];
      if (
        !firstTickObjects ||
        !Object.values(firstTickObjects).find(
          (obj) => obj.type === "controller"
        )
      )
        return;
    }

    DataRequestBroker.emitData(data)
  }

  async executeSingle(forceDataRequest = undefined) {
    const dataRequest = forceDataRequest || (await DataRequestBroker.getDataRequest());
    if (!dataRequest) {
      await wait(10 * 1000);
      return this.executeSingle();
    }

    const { shard } = dataRequest;
    const { room } = dataRequest;
    const { tick } = dataRequest;

    const start = Date.now();
    const dataResult = await GetRoomHistory(this.proxy, shard, room, tick);
    const end = Date.now() - start;
    if (!speed[this.proxy.proxy_address])
      speed[this.proxy.proxy_address] = {
        count: 0,
        total: 0,
      };
    speed[this.proxy.proxy_address].count += 1;
    speed[this.proxy.proxy_address].total += end;
    count += 1;

    if (dataResult.status === "Success")
      logger.debug(`Got data for ${shard}/${room}/${tick}`);
    else logger.debug(`Failed to get data for ${shard}/${room}/${tick}`);

    if (dataResult.status === "Success")
      DataRequestBroker.sendDataResult(
        dataResult.result,
        dataRequest,
        dataRequest.type !== "owned"
      );
    else {
      dataRequest.retries = dataRequest.retries
        ? (dataRequest.retries += 1)
        : 1;

      if (dataRequest.retries < 3) return this.executeSingle(dataRequest);
      if (dataResult.status === "Not found")
        DataRequestBroker.sendDataResult(dataResult.result, dataRequest, true);
      else
        logger.debug(
          `Failed to get data for ${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick} after 3 retries`
        );
    }
    return this.executeSingle();
  }
}

setInterval(() => {
  console.log(new Date().getMinutes())
  console.log(`Requests per second: ${Math.round((count - lastCount) / 60)}`);
  lastCount = count;

  const proxiesKeys = Object.keys(speed);
  proxiesKeys.forEach((proxy) => {
    // console.log(
    //   `Speed for ${proxy}: ${Math.round(
    //     speed[proxy].total / speed[proxy].count
    //   )}ms`
    // );
    // console.log(
    //   `Total requests per second for ${proxy}: ${Math.round(speed[proxy].total / speed[proxy].count
    //   )}`
    // );
    speed[proxy].avg = Math.round(speed[proxy].total / speed[proxy].count);
  });
  console.log("End of minute")
}, 60 * 1000);
