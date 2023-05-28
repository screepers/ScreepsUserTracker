import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";
import Cron from "cron";
import winston from "winston";
import GetRooms, { GetUsernames } from "./rooms/userHelper.js";
import UploadData from "./data/upload.js";
import UpdateRooms from "./rooms/updateRooms.js";
import DataBroker from " ./data/broker.js"
import { GetUsername } from "../rooms/userHelper.js";

const { CronJob } = Cron;
const DEBUG = process.env.DEBUG === "TRUE";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "handler" },
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

const app = express();
const port = 5000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const getIps = () =>
  fs.existsSync("./files/ips.json")
    ? JSON.parse(fs.readFileSync("./files/ips.json"))
    : [];

async function ipIsOnline(ip) {
  try {
    const pong = await axios.get(`${ip}/ping`);
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
  } catch (error) {
    logger.error(error);
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

const dataGetterJob = new CronJob(
  !DEBUG ? "*/5 * * * *" : "* * * * *",
  async () => {
    const start = Date.now();
    const ips = getIps();

    let data = [];
    const status = {};
    for (let i = 0; i < ips.length; i += 1) {
      const ip = ips[i];
      try {
        const result = await axios.get(`${ip}/data`);
        data = [...data, ...result.data.results];

        const simpleIp = ip
          .replace(/http:\/\/|https:\/\//g, "")
          .replace(/\/|:/g, "");
        status[simpleIp] = {
          activeRequestsCount: result.data.activeRequestsCount,
          dataCount: result.data.results.length,
        };
      } catch (error) {
        logger.error(error);

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

    DataBroker.UploadStatus(status);
    for (let i = 0; i < data.length; i += 1) {
      const { dataRequest } = data[i];
      const username = GetUsername(dataRequest.room, dataRequest.shard);
      DataBroker.AddRoomData(username, dataRequest.shard, dataRequest.room, data[i]);
    }

    DataBroker.CheckUsers()
    // UploadData(data, status);
  },
  null,
  false,
  "Europe/Amsterdam"
);
dataGetterJob.start();

const requestRoomUpdaterJob = new CronJob(
  !DEBUG ? "*/10 * * * *" : "* * * * *",
  async () => {
    const start = Date.now();
    UpdateRooms();

    const ips = getIps();
    const ipCount = ips.length;

    // tickSpeed * ticksPerCall * callsPerSecond
    const roomsPerIp = 4.5 * 100 * 2;
    const roomsPerCycle = roomsPerIp * ipCount;

    const usernames = GetUsernames();
    let roomCount = 0;
    const shardRooms = {};

    // const addedUsernames = [];
    for (let i = 0; i < usernames.length; i += 1) {
      const username = usernames[i];
      const userRooms = GetRooms(username);
      if (userRooms.total + roomCount <= roomsPerCycle) {
        // addedUsernames.push(username);
        roomCount += userRooms.total;
        Object.entries(userRooms.rooms).forEach(([shard, data]) => {
          if (!shardRooms[shard]) {
            shardRooms[shard] = [];
          }
          shardRooms[shard].push(...data.owned);
          DataBroker.AddRooms(username, shard, data.owned);
        });
      } else break;
    }

    let splittedRoomsIndex = 0;
    let roomNumber = 0;
    const splittedRooms = [];
    Object.entries(shardRooms).forEach(([shard, rooms]) => {
      for (let i = 0; i < rooms.length; i += 1) {
        if (roomNumber <= roomsPerIp) {
          if (!splittedRooms[splittedRoomsIndex]) {
            splittedRooms[splittedRoomsIndex] = {};
          }
          if (!splittedRooms[splittedRoomsIndex][shard]) {
            splittedRooms[splittedRoomsIndex][shard] = [];
          }
          splittedRooms[splittedRoomsIndex][shard].push(rooms[i]);
          roomNumber += 1;
        } else {
          splittedRoomsIndex += 1;
          roomNumber = 0;
        }
      }
    });

    for (let y = 0; y < ips.length; y += 1) {
      const ip = ips[y];
      try {
        const ipRoomCount = Object.values(splittedRooms[y]).reduce(
          (acc, curr) => acc + curr.length,
          0
        );
        logger.info(`Updating rooms for ${ip} with ${ipRoomCount} rooms`);
        await axios.put(`${ip}/rooms`, { rooms: splittedRooms[y] });
      } catch (error) {
        logger.error(error);

        if (error.message.includes("ECONNREFUSED")) {
          removeIp(ip);
        }
      }
    }

    logger.info(
      `Updated rooms for ${ips.length} ips with ${roomCount} in ${(
        (Date.now() - start) /
        1000
      ).toFixed(2)}s`
    );
  },
  null,
  false,
  "Europe/Amsterdam"
);
requestRoomUpdaterJob.start();

app.listen(port, async () => {
  const ips = getIps();
  for (let i = 0; i < ips.length; i += 1) {
    const ip = ips[i];
    const isOnline = await ipIsOnline(ip);
    if (!isOnline) {
      removeIp();
      logger.info(`Removed ${ip} from ips.json because it was offline!`);
    }
  }
  console.log(`API listening on port ${port}`);
});
