import fs from "fs";
import ProcessDataBroker from "../src/data/broker/processData.js";
import handleCombinedRoomStats from "../src/data/combineResults.js";

const fileName = "1";
const roomData = JSON.parse(
  fs.readFileSync(`./testHelper/files/${fileName}.json`, "utf8")
);
const opts = {
  shard: "shard1",
  room: "room1",
  type: "owned",
  tick: 100,
  username: 'user'
};
const userData = { shards: { [opts.shard]: { 'owned': [opts.room] } } }

let currentCallTimes = 0;
const callTimes = 125 * 60;

const start = Date.now();
console.profile();
while (callTimes > currentCallTimes) {
  const stats = await ProcessDataBroker.single(roomData, opts);
  const shards = { [opts.shard]: { [opts.room]: stats } }
  handleCombinedRoomStats(shards, userData);
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
