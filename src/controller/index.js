import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";
import Cron from "cron";
import winston from "winston";
import UpdateRooms from "./rooms/updateRooms.js";
import GetRooms, { GetUsernames } from "./rooms/userHelper.js";
import UploadData from "./data/upload.js";

const { CronJob } = Cron;
const DEBUG = true;

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
  fs.existsSync("./ips.json") ? JSON.parse(fs.readFileSync("./ips.json")) : [];

async function ipIsOnline(ip) {
  try {
    const getData = await axios.get(`${ip}/data`);
    if (!getData.data.rooms) {
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
  fs.writeFileSync("./ips.json", JSON.stringify(ips));
}

app.post("/ip", async (req, res) => {
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
  fs.writeFileSync("./ips.json", JSON.stringify(ips));
  res.json("Success");
});

app.delete("/ip", async (req, res) => {
  const { ip } = req.body;
  try {
    removeIp();
    logger.info(`${req.ip}: Deleted! ${ip}`);
    res.json("Success");
  } catch (error) {
    logger.info(`${req.ip}: Failed to delete ip! ${ip}`);
    res.json("Failed to delete ip!");
  }
});

const dataGetterJob = new CronJob(
  !DEBUG ? "*/4 * * * *" : "* * * * *",
  async () => {
    const ips = getIps();
    let data = [];
    for (let i = 0; i < ips.length; i += 1) {
      const ip = ips[i];
      try {
        const result = await axios.get(`${ip}/data`);
        data = [...data, ...result.data.results];
      } catch (error) {
        logger.error(`Failed to get data from ${ip}, ${error}`);
        console.log(`Failed to get data from ${ip}`);
      }
    }

    logger.info(`Got ${data.length} results from ${ips.length} ips`);
    UploadData(data);
  },
  null,
  false,
  "Europe/Amsterdam"
);
dataGetterJob.start();

const requestRoomUpdaterJob = new CronJob(
  !DEBUG ? "*/4 * * * *" : "* * * * *",
  async () => {
    await UpdateRooms();
    const ips = getIps();
    const ipCount = ips.length;

    // tickSpeed * ticksPerCall * callsPerMinute * ips
    const roomsPerIp = 4 * 100 * 2;
    const roomsPerCycle = roomsPerIp * ipCount;

    const usernames = GetUsernames();
    let roomCount = 0;
    const shardRooms = {};

    for (let i = 0; i < usernames.length; i += 1) {
      const username = usernames[i];
      const userRooms = GetRooms(username);
      if (userRooms.total + roomCount < roomsPerCycle) {
        roomCount += userRooms.total;
        Object.entries(userRooms.rooms).forEach(([shard, data]) => {
          if (!shardRooms[shard]) {
            shardRooms[shard] = [];
          }
          shardRooms[shard].push(...data.owned);
        });
      }
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
        const roomCount = Object.values(splittedRooms[y]).reduce(
          (acc, curr) => acc + curr.length,
          0
        );
        logger.info(`Updating rooms for ${ip} with ${roomCount} rooms`);
        axios.put(`${ip}/rooms`, { rooms: splittedRooms[y] });
      } catch (error) {
        logger.error(`Failed to update rooms for ${ip}, ${error}`);
      }
    }
  },
  null,
  false,
  "Europe/Amsterdam"
);
requestRoomUpdaterJob.start();

app.listen(port, async () => {
  const ips = getIps();
  for (let i = 0; i < ips.length; i++) {
    const ip = ips[i];
    const isOnline = await ipIsOnline(ip);
    if (!isOnline) {
      removeIp();
      logger.info(`Removed ${ip} from ips.json because it was offline!`);
    }
  }
  console.log(`API listening on port ${port}`);
});
