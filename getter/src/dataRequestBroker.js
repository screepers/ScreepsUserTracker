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

  addDataRequests(dataRequests, addAtStart = false) {
    if (!addAtStart) this.dataRequests = this.dataRequests.concat(dataRequests);
    else this.dataRequests = dataRequests.concat(this.dataRequests);
  }

  getDataRequest() {
    return this.dataRequests.shift();
  }

  getDataRequests() {
    return [...this.dataRequests];
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
    const { dataResults } = this;
    const { dataRequests } = this;

    const perTickResults = {};
    dataResults.forEach(({ dataResult, dataRequest, id }) => {
      if (!perTickResults[dataRequest.shard])
        perTickResults[dataRequest.shard] = {};
      if (!perTickResults[dataRequest.shard][dataRequest.tick])
        perTickResults[dataRequest.shard][dataRequest.tick] = [];
      perTickResults[dataRequest.shard][dataRequest.tick].push({
        dataResult,
        dataRequest,
        id,
      });
    });

    const perTickRequests = {};
    dataRequests.forEach((dataRequest) => {
      if (!perTickRequests[dataRequest.shard])
        perTickRequests[dataRequest.shard] = {};
      if (!perTickRequests[dataRequest.shard][dataRequest.tick])
        perTickRequests[dataRequest.shard][dataRequest.tick] = [];
      perTickRequests[dataRequest.shard][dataRequest.tick].push(dataRequest);
    });

    let dataResultsToSend = [];
    Object.entries(perTickResults).forEach(([shard, perTick]) => {
      Object.entries(perTick).forEach(([tick, data]) => {
        if (!perTickRequests[shard] || !perTickRequests[shard][tick])
          dataResultsToSend = dataResultsToSend.concat(data);
      });
    });

    const dataResultsIdsToRemove = [];
    dataResultsToSend.forEach(({ id }) => {
      dataResultsIdsToRemove.push(id);
    });
    this.removeDataResults(dataResultsIdsToRemove);

    return dataResultsToSend;
  }

  resetDataResults() {
    this.dataResults = [];
  }

  getTotalDataResults() {
    return this.dataResults.length;
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
      this.addDataResult(dataResult.result, dataRequest);
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
