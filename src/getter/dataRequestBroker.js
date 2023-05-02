import ScreepsApi from "./api.js";
import RoomRequests from "./roomRequests.js";

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class DataRequestBroker {
  dataRequests = [];

  dataResults = [];

  roomRequests = null;

  constructor(rooms = {}) {
    this.roomRequests = new RoomRequests(rooms, this);

    this.roomRequests.sync();
    this.executeSingle();
  }

  forceUpdateRooms(rooms) {
    this.roomRequests.forceUpdateRooms(rooms);
  }

  getRooms() {
    return this.roomRequests.getRooms();
  }

  addDataRequests(dataRequests) {
    this.dataRequests = this.dataRequests.concat(dataRequests);
  }

  getDataRequest() {
    return this.dataRequests.shift();
  }

  getDataRequests() {
    return [...this.dataRequests];
  }

  addDataResult(dataResult) {
    this.dataResults.push(dataResult);
  }

  getDataResults(reset = true) {
    if (reset) {
      const dataResults = [...this.dataResults];
      this.dataResults = [];
      return dataResults;
    }

    return this.dataResults
  }

  async executeSingle() {
    const dataRequest = this.getDataRequest();
    if (!dataRequest) {
      await wait(100);
      return this.executeSingle();
    }

    const dataResult = await ScreepsApi.roomHistory(dataRequest);
    if (dataResult) this.addDataResult(dataResult);
    else this.addDataRequests([dataRequest])

    return this.executeSingle();
  }
}
