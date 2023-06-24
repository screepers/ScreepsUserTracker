import * as dotenv from "dotenv";

import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import Cron from "cron";
import { publicIpv4 } from "public-ip";
import DataRequestBroker from "./dataRequestBroker.js";
import { mainLogger as logger, backlogLogger } from "./logger.js";
import settings, { writeSettings } from "./settings.js";

dotenv.config();

const { CronJob } = Cron;

const hasExternalIp = process.env.CONTROLLER_IP !== undefined;
const controllerIp = hasExternalIp
  ? process.env.CONTROLLER_IP
  : "http://localhost:5000";
const port = 4000;
let ip;

// terminate process on exit
process.once("SIGINT", async () => {
  await axios.delete(`${controllerIp}/ip`, { data: { ip } });
  process.exit(0);
});

const dataRequestBroker = new DataRequestBroker();
const app = express();

app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

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
  !settings.debug ? "0 * * * *" : "* * * * *",
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
  ip = hasExternalIp ? `http://${await publicIpv4()}:${port}` : "http://localhost:"+port;

  connectToController();
  console.log(`API listening on port ${port}`);
});
