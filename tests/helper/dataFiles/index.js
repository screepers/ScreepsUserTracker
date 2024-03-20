import fs from 'fs';
import ProcessDataBroker from "../../../src/data/broker/processData.js";

const roomData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const opts = {
  username: "username",
  room: "room",
  shard: "shard",
  tick: 0,
  type: "unknown"
}
// set id each change in data.json
ProcessDataBroker.usernamesById = {
  "61a475b5048fffe95d98bbcf": "username"
};
const stats = await ProcessDataBroker.single({ roomData, opts });
console.log(stats);
