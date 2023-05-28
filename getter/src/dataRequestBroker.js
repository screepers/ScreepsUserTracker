import winston from "winston";
import ScreepsApi from "./api.js";
import RoomRequests from "./roomRequests.js";

let resultId = 0;
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "data-request-broker" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

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
    if (dataRequests.length > 1) {
      const requestsCount = this.dataRequests.length;
      if (requestsCount > 2500) {
        logger.info(
          `Dropping ${requestsCount} requests to add ${dataRequests.length} requests`
        );
        this.dataRequests = [];
      }
    }
    this.dataRequests = this.dataRequests.concat(dataRequests);
  }

  getDataRequest() {
    return this.dataRequests.shift();
  }

  getDataRequests() {
    return [...this.dataRequests];
  }

  addDataResult(dataResult, dataRequest) {
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
        if (!perTickRequests[shard] || perTickRequests[shard][tick])
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

    const dataResult = await ScreepsApi.roomHistory(dataRequest);
    if (dataResult)
      logger.debug(
        `Got data for ${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick}`
      );
    else
      logger.debug(
        `Failed to get data for ${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick}`
      );

    if (dataResult !== null) this.addDataResult(dataResult, dataRequest);
    else {
      dataRequest.retries = dataRequest.retries
        ? (dataRequest.retries += 1)
        : 1;

      if (dataRequest.retries < 3) this.addDataRequests([dataRequest]);
      else
        logger.debug(
          `Failed to get data for ${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick} after 3 retries`
        );
    }
    return this.executeSingle();
  }
}
