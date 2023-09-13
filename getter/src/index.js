import "dotenv/config";

import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import Cron from "cron";
import { publicIpv4 } from "public-ip";
import DataRequestBroker from "./dataRequestBroker.js";
import { ownedLogger as logger, backlogLogger } from "./logger.js";
import settings, { writeSettings } from "./settings.js";

let lastDataSend = Date.now();

const { CronJob } = Cron;

const controllerIp = process.env.CONTROLLER_IP || "http://localhost:5000";
process.env.CONTROLLER_IP = controllerIp;
const port = 4000;
let ip;

process.once("SIGINT", async () => {
  await axios.delete(`${controllerIp}/ip`, { data: { ip } });
  process.exit(0);
});

const dataRequestBroker = new DataRequestBroker();
const app = express();

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

app.get("/healthCheck", (req, res) => {
  logger.info(`${req.ip}: Received health check`);
  const success = Date.now() - lastDataSend < 600 * 1000;
  const minutesAgo = Math.floor((Date.now() - lastDataSend) / 60000);
  return res.json({ success, lastDataSend, minutesAgo });
});

app.post("/ping", (req, res) => {
  writeSettings(req.body);

  logger.info(`${req.ip}: Received ping`);
  return res.send("pong");
});

// app.post("/requests", (req, res) => {
//   const start = Date.now();
//   try {
//     dataRequestBroker.addDataRequests(req.body);

//     logger.info(
//       `Request:post took ${((Date.now() - start) / 1000).toFixed(2)}s`
//     );
//     return res.json("Success");
//   } catch (e) {
//     logger.error(
//       `${req.ip}: Failed to save requests with ${e.message} and stack of ${e.stack}`
//     );
//     return res.status(500).json("Failed to save requests");
//   }
// });
// app.get("/data", (req, res) => {
//   const start = Date.now();
//   try {
//     logger.info(`${req.ip}: Received data request`);

//     const results = dataRequestBroker.getDataResultsToSend();
//     const requestsCount = dataRequestBroker.getTotalDataRequests();

//     if (results.length > 0) {
//       lastDataSend = Date.now();
//     }

//     logger.info(`Data:get took ${((Date.now() - start) / 1000).toFixed(2)}s`);
//     return res.json({
//       results,
//       requestsCount,
//     });
//   } catch (e) {
//     logger.error(
//       `${req.ip}: Failed to get data with ${e.message} and stack of ${e.stack}`
//     );
//     return res.status(500).json("Failed to get data");
//   }
// });

async function connectToController() {
  try {
    const result = await axios.post(`${controllerIp}/ip`, { ip });
    if (result.status === 200) {
      logger.info(`Connected to controller at ${controllerIp}`);
    }
  } catch (e) {
    logger.error(`Failed to connect to controller, trying again in 60 seconds`);
    logger.error(e)
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    connectToController();
  }
}

// const job = new CronJob(
//   !settings.debug ? "0 * * * *" : "* * * * *",
//   () => {
//     const requestCount = dataRequestBroker.getTotalDataRequests();
//     const resultCount = dataRequestBroker.getTotalDataResults();
//     backlogLogger.info(
//       `Request count: ${requestCount}, Result count: ${resultCount}`
//     );
//   },
//   null,
//   false,
//   "Europe/Amsterdam"
// );
// job.start();

app.listen(port, async () => {
  if (!process.env.GETTER_IP) {
    ip = process.env.CONTROLLER_IP
      ? `http://${await publicIpv4()}:${port}`
      : `http://localhost:${port}`;
  }
  else ip = process.env.GETTER_IP

  connectToController();
  console.log(`Starting API on ${ip}`)
  console.log(`API listening on port ${port}`);
});
