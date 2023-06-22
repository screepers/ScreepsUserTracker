import * as dotenv from "dotenv";

import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import Cron from "cron";
import DataRequestBroker from "./dataRequestBroker.js";
import { mainLogger as logger, backlogLogger } from "./logger.js";
import { writeSettings } from "./settings.js";

dotenv.config();

const { CronJob } = Cron;

const controllerIp = process.env.CONTROLLER_IP || "http://localhost:5000";
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

app.post("/ping", (req, res) => {
  writeSettings(req.body);

  logger.info(`${req.ip}: Received ping`);
  return res.send("pong");
});

app.post("/requests", (req, res) => {
  const start = Date.now();
  try {
    dataRequestBroker.addDataRequests(req.body);

    logger.info(
      `Request:post took ${((Date.now() - start) / 1000).toFixed(2)}s`
    );
    return res.json("Success");
  } catch (e) {
    logger.error(
      `${req.ip}: Failed to save requests with ${e.message} and stack of ${e.stack}`
    );
    return res.status(500).json("Failed to save requests");
  }
});
app.get("/data", (req, res) => {
  const start = Date.now();
  try {
    logger.info(`${req.ip}: Received data request`);

    const results = dataRequestBroker.getDataResultsToSend();
    const requestsCount = dataRequestBroker.getTotalDataRequests();

    logger.info(`Data:get took ${((Date.now() - start) / 1000).toFixed(2)}s`);
    return res.json({
      results,
      requestsCount,
    });
  } catch (e) {
    logger.error(
      `${req.ip}: Failed to get data with ${e.message} and stack of ${e.stack}`
    );
    return res.status(500).json("Failed to get data");
  }
});

async function connectToController() {
  try {
    const result = await axios.post(`${controllerIp}/ip`, { ip });
    if (result.status === 200) {
      logger.info(`Connected to controller at ${controllerIp}`);
    }
  } catch (e) {
    logger.error(`Failed to connect to controller, trying again in 60 seconds`);
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    connectToController();
  }
}

const job = new CronJob(
  !DEBUG ? "0 * * * *" : "* * * * *",
  () => {
    const requestCount = dataRequestBroker.getTotalDataRequests();
    const resultCount = dataRequestBroker.getTotalDataResults();
    backlogLogger.info(
      `Request count: ${requestCount}, Result count: ${resultCount}`
    );
  },
  null,
  false,
  "Europe/Amsterdam"
);
job.start();

app.listen(port, async () => {
  connectToController();
  console.log(`API listening on port ${port}`);
});
