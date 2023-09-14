import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { publicIpv4 } from "public-ip";
import { ownedLogger as logger } from "./logger.js";
import { writeSettings } from "./settings.js";
import DataRequestBroker from "./dataRequestBroker.js";

const controllerIp = process.env.CONTROLLER_IP;

const lastDataSend = Date.now();

const port = 4000;
let ip;

process.once("SIGINT", async () => {
  await axios.delete(`${controllerIp}/ip`, { data: { ip } });
  process.exit(0);
});

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

// eslint-disable-next-line no-new
new DataRequestBroker();

async function connectToController() {
  try {
    const result = await axios.post(`${controllerIp}/ip`, { ip });
    if (result.status === 200) {
      logger.info(`Connected to controller at ${controllerIp}`);
    }
  } catch (e) {
    logger.error(`Failed to connect to controller, trying again in 60 seconds`);
    logger.error(e);
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    connectToController();
  }
}

app.listen(port, async () => {
  if (!process.env.GETTER_IP) {
    ip = !process.env.CONTROLLER_IP.includes("localhost")
      ? `http://${await publicIpv4()}:${port}`
      : `http://localhost:${port}`;
  } else ip = process.env.GETTER_IP;

  connectToController();
  console.log(`Starting API on ${ip}`);
  console.log(`API listening on port ${port}`);
});
