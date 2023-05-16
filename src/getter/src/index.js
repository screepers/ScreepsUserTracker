import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import winston from "winston";
import Cron from "cron";
import DataRequestBroker from "./dataRequestBroker.js";

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

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "public-api" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

const backlogLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.File({ filename: "logs/backlog.log" })],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

const dataRequestBroker = new DataRequestBroker();
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/ping", (req, res) => {
  logger.info(`${req.ip}: Received ping`);
  res.send("pong");
});

app.put("/rooms", (req, res) => {
  logger.info(
    `${req.ip}: Updating rooms, received ${JSON.stringify(req.body)}`
  );

  const { rooms } = req.body;
  dataRequestBroker.forceUpdateRooms(rooms);
  res.json("Success");
});
app.get("/data", (req, res) => {
  logger.info(`${req.ip}: Received data request`);

  const results = dataRequestBroker.getDataResults();
  const activeRequests = dataRequestBroker.getDataRequests();
  const rooms = dataRequestBroker.getRooms();
  return res.json({ results, activeRequestsCount: activeRequests.length, rooms });
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
    const resultCount = dataRequestBroker.getDataResults(false).length;
    backlogLogger.info(
      `Room count: ${roomCount}, Active request count: ${activeRequestCount}, Result count: ${resultCount}`
    );

    if (resultCount > 5000) dataRequestBroker.getDataResults();
  },
  null,
  false,
  "Europe/Amsterdam"
);
job.start();
