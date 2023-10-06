import { CronJob } from "cron";
import ProcessDataBroker from "../data/broker/processData.js";
import DataRequestsBroker from "../data/broker/requests.js";
import GetRoomHistory from "./screepsApi.js";
let count = 0;

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class DataRequestBroker {
  dataRequests = [];

  dataResults = [];

  proxy;

  constructor(proxy = null) {
    this.proxy = proxy;
  }

  static async getDataRequest() {
    const request = DataRequestsBroker.getRequest();
    return request;
  }

  static sendDataResult(dataResult, dataRequest, force = false) {
    const data = {
      dataResult,
      dataRequest,
    };
    if (!force) {
      const firstTickObjects = Object.values(dataResult.ticks).find(
        (tl) => tl !== null
    );
      if (
        !firstTickObjects ||
        !Object.values(firstTickObjects).find(
          (obj) => obj.type === "controller"
        )
      )
        return;
    }

    ProcessDataBroker.single(data);
    count += 1;
  }

  async executeSingle(forceDataRequest = undefined) {
    const dataRequest = forceDataRequest || (await DataRequestBroker.getDataRequest());
    if (!dataRequest) {
      if (process.env.GETTER_DISABLED !== "TRUE") await wait(10 * 1000);
      return this.executeSingle();
    }

    const { shard } = dataRequest;
    const { room } = dataRequest;
    const { tick } = dataRequest;

    const dataResult = await GetRoomHistory(this.proxy, shard, room, tick);

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

      if (dataRequest.retries < 2) return this.executeSingle(dataRequest);
      if (dataResult.status === "Not found")
        DataRequestBroker.sendDataResult(dataResult.result, dataRequest, true);
    }
    return this.executeSingle();
  }
}

const logStatus = new CronJob(
  "* * * * *",
  () => {
    console.log(count, "per minute", Math.round(count / 60), "per second");
    count = 0;
  },
  null,
  false,
  "Europe/Amsterdam"
);
logStatus.start();