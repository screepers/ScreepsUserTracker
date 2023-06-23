import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";
import Cron from "cron";
import UpdateRooms from "./rooms/updateRooms.js";
import MainDataBroker from "./data/broker/main.js";
import ReactorDataBroker from "./data/broker/reactor.js";
import DataRequestsBroker from "./data/broker/requests.js";
import { mainLogger as logger } from "./logger.js";

const { CronJob } = Cron;
const DEBUG = process.env.DEBUG === "TRUE";

const app = express();
const port = 5000;
let isOnline = false;

const mainDataBroker = new MainDataBroker();
const reactorDataBroker = new ReactorDataBroker();
const dataRequestsBroker = new DataRequestsBroker();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function getRoomsPerCycle(ipCount) {
  // tickSpeed * ticksPerCall * callsPerSecond
  const roomsPerIp = 4.5 * 100 * 2;
  const roomsPerCycle = roomsPerIp * ipCount;
  return roomsPerCycle;
}

const settings = {
  serverType: process.env.SERVER_TYPE,
  screepsToken: process.env.SCREEPS_TOKEN,
};

const getIps = () =>
  fs.existsSync("./files/ips.json")
    ? JSON.parse(fs.readFileSync("./files/ips.json"))
    : [];

async function ipIsOnline(ip) {
  try {
    const pong = await axios.post(`${ip}/ping`, settings);
    if (pong.data !== "pong") {
      return false;
    }
  } catch (error) {
    return false;
  }

  return true;
}

function removeIp(ip) {
  const ips = getIps();
  ips.splice(ips.indexOf(ip), 1);
  fs.writeFileSync("./files/ips.json", JSON.stringify(ips));
}

app.post("/ip", async (req, res) => {
  try {
    const ips = getIps();
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
  if (!isOnline) return;
  const start = Date.now();
  const ips = getIps();
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

      await axios.post(
        `${ip}/requests`,
        dataRequestsBroker.getRequestsToSend(
          Math.min(roomsPerCycle * 5 - result.data.requestsCount, roomsPerCycle)
        )
      );
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

  await mainDataBroker.UploadStatus(status);

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
      case "main":
        await mainDataBroker.AddRoomsData(dataOfType);
        break;
      case "reactor":
        await reactorDataBroker.AddRoomsData(dataOfType);
        break;
      default:
        break;
    }
  }
}

async function requestRoomUpdater() {
  if (!isOnline) return;
  const start = Date.now();
  await UpdateRooms();

  const ips = getIps();
  const roomsPerCycle = getRoomsPerCycle(ips.length);

  // eslint-disable-next-line prefer-const
  let { userCount, roomCount, types } = {
    userCount: 0,
    roomCount: 0,
    types: {},
  };
  const dataTypes = process.env.DATA_TYPES.split(" ");
  for (let dt = 0; dt < dataTypes.length; dt += 1) {
    const dataType = dataTypes[dt];
    switch (dataType) {
      case "main": {
        const roomsToCheck = mainDataBroker.getRoomsToCheck(
          roomsPerCycle,
          types
        );
        userCount += roomsToCheck.userCount;
        roomCount += roomsToCheck.roomCount;
        break;
      }
      case "reactor":
        if (process.env.SERVER_TYPE === "seasonal") {
          roomCount = await reactorDataBroker.getRoomsToCheck(
            roomsPerCycle,
            roomCount,
            types
          );
        }
        break;
      default:
        break;
    }
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
  !DEBUG ? "*/10 * * * * * *" : "*/10 * * * * *",
  dataGetter,
  null,
  false,
  "Europe/Amsterdam"
);

const requestRoomUpdaterJob = new CronJob(
  !DEBUG ? "*/5 * * * *" : "* * * * *",
  requestRoomUpdater,
  null,
  false,
  "Europe/Amsterdam"
);

app.listen(port, async () => {
  const ips = getIps();
  for (let i = 0; i < ips.length; i += 1) {
    const ip = ips[i];
    if (!(await ipIsOnline(ip))) {
      removeIp();
      logger.info(`Removed ${ip} from ips.json because it was offline!`);
    }
  }
  console.log(`API listening on port ${port}`);

  await dataRequestsBroker.constructorAsync();
  isOnline = true;

  await requestRoomUpdater();
  await dataGetter();
  requestRoomUpdaterJob.start();
  dataGetterJob.start();
});
