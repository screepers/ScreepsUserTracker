/* eslint-disable import/no-relative-packages */
import { CronJob } from "cron";
import ProcessDataBroker from "../data/broker/processData.js";
import DataRequestsBroker from "../data/broker/requests.js";
import DataRequestBroker from "../../../getter/src/dataRequestBroker.js";
import { getAllProxies } from "../../../getter/src/helper.js";

let count = 0;

export default class LocalDataRequestBroker {

  static async start() {
    DataRequestBroker.getDataRequest = this.getDataRequest;
    DataRequestBroker.sendDataResult = this.sendDataResult;

    const proxies = await getAllProxies();
    for (let p = 0; p < proxies.length; p += 1) {
      const proxy = proxies[p];
      const broker = new DataRequestBroker(proxy);
      broker.executeSingle();
    }
    if (proxies.length === 0) {
      const broker = new DataRequestBroker();
      broker.executeSingle();
    }
  }

  static getDataRequest() {
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