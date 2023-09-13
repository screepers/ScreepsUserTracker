import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";
import Cron from "cron";
import UpdateRooms from "./rooms/updateRooms.js";
import OwnedDataBroker from "./data/broker/owned.js";
import ReactorDataBroker from "./data/broker/custom/reactor.js";
import ReservedDataBroker from "./data/broker/custom/reserved.js";
import DataRequestsBroker from "./data/broker/requests.js";
import { ownedLogger as logger } from "./logger.js";
import websocketConnection from './websocket/connect.js';

const { CronJob } = Cron;
const DEBUG = process.env.DEBUG === "TRUE";

const app = express();
const port = 5000;
let isOnlineMode = 0;

let healthCheck = {
  lastDataReceived: Date.now(),
  lastRequestSent: Date.now(),
}

const dataRequestsBroker = new DataRequestsBroker();

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

function getRoomsPerCycle(ipCount) {
  // tickSpeed * ticksPerCall * callsPerSecond
  const roomsPerIp = 4.5 * 100 * 2;
  const roomsPerCycle = roomsPerIp * ipCount;
  return roomsPerCycle;
}

const settings = {
  serverType: process.env.SERVER_TYPE,
  debug: DEBUG,
};

let ips = [];

function getIps() {
  return fs.existsSync("./files/ips.json")
    ? JSON.parse(fs.readFileSync("./files/ips.json"))
    : [];
}

async function ipIsOnline(ip) {
  try {
    await axios.post(`${ip}/ping`, settings);
  } catch (error) {
    return false;
  }

  return true;
}
function removeIp(ip) {
  ips = getIps().filter((i) => i !== ip);
  fs.writeFileSync("./files/ips.json", JSON.stringify(ips));
}

app.get("/healthCheck", (req, res) => {
  logger.info(`${req.ip}: Received health check`);
  const success = Date.now() - healthCheck.lastDataReceived < 600 * 1000 && Date.now() - healthCheck.lastRequestSent < 600 * 1000;
  const lastDataReceivedMinutesAgo = Math.floor(
    (Date.now() - healthCheck.lastDataReceived) / 60000
  );
  const lastRequestSentMinutesAgo = Math.floor(
    (Date.now() - healthCheck.lastRequestSent) / 60000
  );

  return res.json({
    success,
    lastDataReceived: healthCheck.lastDataReceived,
    lastRequestSent: healthCheck.lastRequestSent,
    lastDataReceivedMinutesAgo,
    lastRequestSentMinutesAgo
  });
});

app.post("/ip", async (req, res) => {
  try {
    const { ip } = req.body;
    const ipOnline = await ipIsOnline(ip);
    if (!ipOnline) {
      logger.info(`${req.ip}: Failed to register with controller! ${ip}`);
      res.status(400).json("Failed to register with controller!");
      return;
    }

    if (ips.includes(ip)) {
      logger.info(`${req.ip}: Already added! ${ip}`);
      res.json("Already added");
      return;
    }

    logger.info(`${req.ip}: Added! ${ip}`);
    ips.push(ip);
    fs.writeFileSync("./files/ips.json", JSON.stringify(ips));
    res.json("Success");
  } catch (e) {
    logger.error(`${e.message}\nStack of ${e.stack}`);
    res.status(500).json("Failed to register with controller!");
  }
});

app.delete("/ip", async (req, res) => {
  try {
    const { ip } = req.body;
    removeIp(ip);
    logger.info(`${req.ip}: Deleted! ${ip}`);
    res.json("Success");
  } catch (error) {
    logger.info(error);
    res.json("Failed to delete ip!");
  }
});

async function dataGetter() {
  if (isOnlineMode < 2) return;
  const start = Date.now();
  const roomsPerCycle = getRoomsPerCycle(ips.length);

  let data = [];
  const status = {
    totalRequests: dataRequestsBroker.requests.length,
    ips: {},
  };
  for (let i = 0; i < ips.length; i += 1) {
    const ip = ips[i];
    try {
      const result = await axios.get(`${ip}/data`);
      data = [...data, ...result.data.results];

      const simpleIp = ip
        .replace(/http:\/\/|https:\/\//g, "")
        .replace(/\/|:/g, "");
      status.ips[simpleIp] = {
        requestsCount: result.data.requestsCount,
        dataCount: result.data.results.length,
      };


      const requestsToSend = dataRequestsBroker.getRequestsToSend(
        Math.min(roomsPerCycle - result.data.requestsCount, roomsPerCycle)
      )

      await axios.post(
        `${ip}/requests`,
        requestsToSend
      );

      if (requestsToSend.length > 0) healthCheck.lastRequestSent = Date.now();
      if (result.data.results.length > 0) healthCheck.lastDataReceived = Date.now();
    } catch (error) {
      logger.error(`${error.message}\nStack of ${error.stack}`);

      if (error.message.includes("ECONNREFUSED")) {
        removeIp(ip);
      }
    }
  }

  logger.info(
    `Got ${data.length} results from ${ips.length} ips in ${(
      (Date.now() - start) /
      1000
    ).toFixed(2)}s`
  );

  await OwnedDataBroker.UploadStatus(status);

  const dataByType = data.reduce((acc, curr) => {
    const requestType = curr.dataRequest.type;
    if (!acc[requestType]) acc[requestType] = [];
    acc[requestType].push(curr);
    return acc;
  }, {});
  const dataByTypeKeys = Object.keys(dataByType);
  for (let i = 0; i < dataByTypeKeys.length; i += 1) {
    const dataType = dataByTypeKeys[i];
    const dataOfType = dataByType[dataType];

    switch (dataType) {
      case "owned":
        await OwnedDataBroker.AddRoomsData(dataOfType);
        break;
      case "reactor":
        await ReactorDataBroker.AddRoomsData(dataOfType);
        break;
      case "reserved":
        await ReservedDataBroker.AddRoomsData(dataOfType);
        break;
      default:
        break;
    }
  }
}

async function requestRoomUpdater() {
  if (isOnlineMode < 1) return;
  const start = Date.now();
  await UpdateRooms();

  const roomsPerCycle = getRoomsPerCycle(ips.length);

  // eslint-disable-next-line prefer-const
  let { userCount, roomCount, types } = {
    userCount: 0,
    roomCount: 0,
    types: {},
  };
  const dataTypes = process.env.DATA_TYPES;

  if (dataTypes.includes("reactor")) {
    if (process.env.SERVER_TYPE === "seasonal") {
      roomCount = await ReactorDataBroker.getRoomsToCheck(
        roomsPerCycle,
        roomCount,
        types
      );
    }
  }

  if (dataTypes.includes("owned")) {
    const roomsToCheck = OwnedDataBroker.getRoomsToCheck(
      roomsPerCycle,
      types,
      dataTypes.includes("reserved"),
      ReservedDataBroker
    );
    userCount += roomsToCheck.userCount;
    roomCount += roomsToCheck.roomCount;
  }
  else if (dataTypes.includes("reserved")) {
    const roomsToCheck = ReservedDataBroker.getRoomsToCheck(
      roomsPerCycle,
      types
    );
    userCount += roomsToCheck.userCount;
    roomCount += roomsToCheck.roomCount;
  }

  dataRequestsBroker.saveRoomsBeingChecked(types);

  logger.info(
    `Updated requested rooms with ${roomCount} rooms and ${userCount} users in ${(
      (Date.now() - start) /
      1000
    ).toFixed(2)}s`
  );
}

const dataGetterJob = new CronJob(
  !DEBUG ? "* * * * *" : "* * * * *",
  dataGetter,
  null,
  false,
  "Europe/Amsterdam"
);

const requestRoomUpdaterJob = new CronJob(
  "0 * * * *",
  requestRoomUpdater,
  null,
  false,
  "Europe/Amsterdam"
);

const httpServer = app.listen(port, async () => {
  ips = getIps();
  for (let i = 0; i < ips.length; i += 1) {
    const ip = ips[i];
    if (!(await ipIsOnline(ip))) {
      removeIp();
      logger.info(`Removed ${ip} from ips.json because it was offline!`);
    }
  }
  console.log(`API listening on port ${port}`);

  await dataRequestsBroker.constructorAsync();
  isOnlineMode = 1;

  logger.info("Starting initial room update!");
  await requestRoomUpdater();
  logger.info("Finished initial room update!");

  if (process.env.TESTING === 'TRUE') {
    console.log("Testing mode!")
    return;
  }
  isOnlineMode = 2;

  // logger.info("Starting initial data get!");
  // await dataGetter();
  // logger.info("Finished initial data get!");


  requestRoomUpdaterJob.start();
  // dataGetterJob.start();
});

if (process.env.TESTING !== 'TRUE') websocketConnection(httpServer)

