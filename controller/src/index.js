import express from "express";
import bodyParser from "body-parser";
import { CronJob } from "cron";
import UpdateRooms from "./rooms/updateRooms.js";
import OwnedDataBroker from "./data/broker/custom/owned.js";
import ReservedDataBroker from "./data/broker/custom/reserved.js";
import DataRequestsBroker from "./data/broker/requests.js";
import { ownedLogger as logger } from "./logger.js";
import websocketConnection from "./websocket/connect.js";
import { removeAllOfflineIps, getRoomsPerCycle, IpRouter } from "./ips.js";
import adminUtilsStart from "./adminUtilsTracker/index.js";
import LocalDataRequestBroker from "./localDataRequestBroker/index.js";


const debug = process.env.DEBUG === "TRUE"
const app = express();
const port = 5001;
let isOnlineMode = 0;

const healthCheck = {
  lastDataReceived: Date.now(),
  lastRequestSent: Date.now(),
};

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

app.use("/api", IpRouter());
app.get("/api/healthCheck", (req, res) => {
  logger.info(`${req.ip}: Received health check`);
  const success =
    Date.now() - healthCheck.lastDataReceived < 600 * 1000 &&
    Date.now() - healthCheck.lastRequestSent < 600 * 1000;
  const lastDataReceivedMinutesAgo = Math.floor(
    (Date.now() - healthCheck.lastDataReceived) / 60000
  );
  const lastRequestSentMinutesAgo = Math.floor(
    (Date.now() - healthCheck.lastRequestSent) / 60000
  );

  return res.json({
    success,
    lastDataReceived: healthCheck.lastDataReceived,
    lastRequestSent: healthCheck.lastRequestSent,
    lastDataReceivedMinutesAgo,
    lastRequestSentMinutesAgo,
  });
});

async function initialRoomUpdater() {
  if (isOnlineMode < 1) return;
  const start = Date.now();
  await UpdateRooms();

  const roomsPerCycle = getRoomsPerCycle();

  // eslint-disable-next-line prefer-const
  let { userCount, roomCount, types } = {
    userCount: 0,
    roomCount: 0,
    types: {},
  };
  const dataTypes = process.env.DATA_TYPES;

  if (dataTypes.includes("owned")) {
    const roomsToCheck = OwnedDataBroker.getRoomsToCheck(
      roomsPerCycle,
      types,
      dataTypes.includes("reserved"),
      ReservedDataBroker
    );
    userCount += roomsToCheck.userCount;
    roomCount += roomsToCheck.roomCount;
    await OwnedDataBroker.UploadStatus();
  } else if (dataTypes.includes("reserved")) {
    const roomsToCheck = ReservedDataBroker.getRoomsToCheck(
      roomsPerCycle,
      types
    );
    userCount += roomsToCheck.userCount;
    roomCount += roomsToCheck.roomCount;
    await ReservedDataBroker.UploadStatus();
  }

  DataRequestsBroker.saveRoomsBeingChecked(types);

  logger.info(
    `Updated requested rooms with ${roomCount} rooms and ${userCount} users in ${(
      (Date.now() - start) /
      1000
    ).toFixed(2)}s`
  );
}

const initialRoomUpdaterJob = new CronJob(
  debug ? "*/10 * * * *" : "0 * * * *",
  initialRoomUpdater,
  null,
  false,
  "Europe/Amsterdam"
);

function callSyncRequests() {
  DataRequestsBroker.syncRequests();
}

const syncRequestsJob = new CronJob(
  "*/1 * * * *",
  callSyncRequests,
  null,
  false,
  "Europe/Amsterdam"
);

const httpServer = app.listen(port, async () => {
  await removeAllOfflineIps();
  console.log(`API listening on port ${port}`);

  await DataRequestsBroker.constructorAsync();
  isOnlineMode = 1;

  logger.info("Starting initial room update!");
  await initialRoomUpdater();
  logger.info("Finished initial room update!");

  initialRoomUpdaterJob.start();
  syncRequestsJob.start();
  if (process.env.GETTER_DISABLED !== "TRUE") websocketConnection(httpServer);
  else LocalDataRequestBroker.start();
});

if (process.env.POSTGRES_ENABLED === "TRUE" && process.env.PRIVATE_SERVER_HOST) adminUtilsStart();