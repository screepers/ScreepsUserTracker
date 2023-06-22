import { GetRoomHistory } from "./screepsApi.js";
import RoomRequests from "./roomRequests.js";
import { dataRequestBroker as logger } from "./logger.js";

let resultId = 0;

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class DataRequestBroker {
  dataRequests = [];

  dataResults = [];

  roomRequests = null;

  constructor() {
    this.roomRequests = new RoomRequests(this);

    this.roomRequests.sync();
    this.executeSingle();
  }

  forceUpdateRooms(rooms, type) {
    this.roomRequests.forceUpdateRooms(rooms, type);
  }

  getRooms(type) {
    return this.roomRequests.getRooms(type);
  }

  addDataRequests(dataRequests, addAtStart = false) {
    if (!addAtStart) this.dataRequests = this.dataRequests.concat(dataRequests);
    else this.dataRequests = dataRequests.concat(this.dataRequests);
  }

  getDataRequest() {
    return this.dataRequests.shift();
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

  removeDataResults(ids) {
    this.dataResults = this.dataResults.filter(
      (dataResult) => !ids.includes(dataResult.id)
    );
  }

  getDataResultsToSend() {
    const dataResults = [...this.dataResults];

    const dataResultsIdsToRemove = [];
    dataResults.forEach(({ id }) => {
      dataResultsIdsToRemove.push(id);
    });
    this.removeDataResults(dataResultsIdsToRemove);

    return dataResultsToSend;
  }

  getTotalDataResults() {
    return this.dataResults.length;
  }
  getTotalDataRequests() {
    return this.dataRequests.length;
  }

  async executeSingle() {
    const dataRequest = this.getDataRequest();
    if (!dataRequest) {
      await wait(100);
      return this.executeSingle();
    }

    const { shard } = dataRequest;
    const { room } = dataRequest;
    const { tick } = dataRequest;

    const dataResult = await GetRoomHistory(shard, room, tick);
    if (dataResult.status === "Success")
      logger.debug(`Got data for ${shard}/${room}/${tick}`);
    else logger.debug(`Failed to get data for ${shard}/${room}/${tick}`);

    if (dataResult.status === "Success")
      this.addDataResult(
        dataResult.result,
        dataRequest,
        dataRequest.type !== "main"
      );
    else {
      dataRequest.retries = dataRequest.retries
        ? (dataRequest.retries += 1)
        : 1;

      if (dataRequest.retries < 3) this.addDataRequests([dataRequest], true);
      else if (dataResult.status === "Not found")
        this.addDataResult(dataResult.result, dataRequest, true);
      else
        logger.debug(
          `Failed to get data for ${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick} after 3 retries`
        );
    }
    return this.executeSingle();
  }
}
