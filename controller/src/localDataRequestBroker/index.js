import ProcessDataBroker from "../data/broker/processData.js";
import DataRequestsBroker from "../data/broker/requests.js";
// eslint-disable-next-line import/no-relative-packages
import DataRequestBroker from "../../../getter/src/dataRequestBroker.js";

export default class LocalDataRequestBroker {
  static dataRequestBroker = null;

  static start() {
    DataRequestBroker.getDataRequest = this.getDataRequest;
    DataRequestBroker.sendDataResult = this.sendDataResult;
    this.dataRequestBroker = new DataRequestBroker();

    this.dataRequestBroker.executeSingle();
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

    ProcessDataBroker.single(data);
  }
}