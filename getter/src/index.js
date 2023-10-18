import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { publicIpv4 } from "public-ip";
import { ownedLogger as logger } from "./logger.js";
import { writeSettings } from "./settings.js";
import DataRequestBroker from "./dataRequestBroker.js";
import { getAllProxies } from "./helper.js";

if (process.env.GETTER_DISABLED === "TRUE") {
  console.log("Getter disabled, exiting");
  process.exit(0);
}

const controllerIp = process.env.CONTROLLER_IP;

const lastDataSend = Date.now();

const port = 4000;
let ip;

process.once("SIGINT", async () => {
  await axios.delete(`${controllerIp}/api/ip`, { data: { ip } });
  process.exit(0);
});

const app = express();

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

app.get("/api/healthCheck", (req, res) => {
  logger.info(`${req.ip}: Received health check`);
  const success = Date.now() - lastDataSend < 600 * 1000;
  const minutesAgo = Math.floor((Date.now() - lastDataSend) / 60000);
  return res.json({ success, lastDataSend, minutesAgo });
});

app.post("/api/ping", (req, res) => {
  writeSettings(req.body);

  logger.info(`${req.ip}: Received settings/ping`);
  return res.send("pong");
});

async function connectToController() {
  try {
    console.log(`Connecting to controller at ${controllerIp}`);
    const result = await axios.post(`${controllerIp}/api/ip`, { ip: process.env.GETTER_IP || ip });
    if (result.status === 200) {
      logger.info(`Connected to controller at ${controllerIp}`);
      const proxies = await getAllProxies();
      for (let p = 0; p < proxies.length; p += 1) {
        const proxy = proxies[p];
        const broker = new DataRequestBroker(proxy);
        broker.executeSingle();
      }
      if (proxies.length === 0) {
        const broker = new DataRequestBroker();
        broker.executeSingle();
      }
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
    ip = !process.env.CONTROLLER_IP_EXTERNAL === "TRUE"
      ? `http://${await publicIpv4()}:${port}`
      : `http://localhost:${port}`;
  } else ip = process.env.GETTER_IP;

  connectToController();
  console.log(`Starting API on ${ip}`);
  console.log(`API listening on port ${port}`);
});
