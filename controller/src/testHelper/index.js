import fs from "fs";
import ProcessDataBroker from "../data/broker/processData.js";

const roomData = {};

const fileName = "1";
roomData.dataResult = JSON.parse(
  fs.readFileSync(`./src/testHelper/files/${fileName}.json`, "utf8")
);
roomData.dataRequest = {
  shard: "shard1",
  room: "room1",
  type: "owned",
  tick: 100,
};

let currentCallTimes = 0;
const callTimes = 10 * 60 * 50;

const start = Date.now();
console.profile();
while (callTimes > currentCallTimes) {
  ProcessDataBroker.single(roomData);
  currentCallTimes += 1;
}
console.profileEnd();
const timeTaken = Date.now() - start;

console.log(
  `Time needed per 1 minute of requests: ${Math.round(
    timeTaken / 1000
  )}s\r\nTime needed per 1 request: ${Math.round(timeTaken / callTimes)}ms`
);
process.exit(0);
