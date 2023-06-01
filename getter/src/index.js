import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import winston from "winston";
import Cron from "cron";
import DataRequestBroker from "./dataRequestBroker.js";
import {mainLogger as logger, backlogLogger} from "./logger.js"

const { CronJob } = Cron;

const controllerIp = "http://localhost:5000";
const port = 4000;
const ip = `http://localhost:${port}`;
const DEBUG = true;

// terminate process on exit
process.once("SIGINT", async () => {
  await axios.delete(`${controllerIp}/ip`, { data: { ip } });
  process.exit(0);
});

const dataRequestBroker = new DataRequestBroker();
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/ping", (req, res) => {
  logger.info(`${req.ip}: Received ping`);
  return res.send("pong");
});

app.put("/rooms", (req, res) => {
  const start = Date.now();
  try {
    const roomCount = Object.entries(req.body.rooms).reduce(
      // eslint-disable-next-line no-unused-vars
      (acc, [_, value]) => acc + value.length,
      0
    );
    logger.info(`${req.ip}: Updating rooms, received ${roomCount} rooms`);

    const { rooms } = req.body;
    dataRequestBroker.forceUpdateRooms(rooms);

    logger.info(`Room:put took ${((Date.now() - start) / 1000).toFixed(2)}s`);
    return res.json("Success");
  } catch (e) {
    logger.error(
      `${req.ip}: Failed to update rooms with ${JSON.stringify(
        req.body
      )} and error ${e}`
    );
    return res.status(500).json("Failed to update rooms");
  }
});
app.get("/data", (req, res) => {
  const start = Date.now();
  try {
    logger.info(`${req.ip}: Received data request`);

    const results = dataRequestBroker.getDataResultsToSend();
    const activeRequests = dataRequestBroker.getDataRequests();
    const rooms = dataRequestBroker.getRooms();

    logger.info(`Data:get took ${((Date.now() - start) / 1000).toFixed(2)}s`);
    return res.json({
      results,
      activeRequestsCount: activeRequests.length,
      rooms,
    });
  } catch (e) {
    logger.error(`${req.ip}: Failed to get data with ${e}`);
    return res.status(500).json("Failed to get data");
  }
});

async function connectToController() {
  try {
    const result = await axios.post(`${controllerIp}/ip`, { ip });
    if (result.status === 200) {
      logger.info(`Connected to controller at ${controllerIp}`);
      return;
    }
  } catch (e) {
    logger.error(`Failed to connect to controller, trying again in 60 seconds`);
  }
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
  connectToController();
}

app.listen(port, async () => {
  connectToController();
  console.log(`API listening on port ${port}`);
});

const job = new CronJob(
  !DEBUG ? "*/5 * * * *" : "* * * * *",
  () => {
    const roomCount = Object.values(dataRequestBroker.getRooms())
      .map((x) => x.length)
      .reduce((a, b) => a + b, 0);
    const activeRequestCount = dataRequestBroker.getDataRequests().length;
    const resultCount = dataRequestBroker.getTotalDataResults();
    backlogLogger.info(
      `Room count: ${roomCount}, Active request count: ${activeRequestCount}, Result count: ${resultCount}`
    );

    if (resultCount > 5000) dataRequestBroker.resetDataResults();
  },
  null,
  false,
  "Europe/Amsterdam"
);
job.start();
