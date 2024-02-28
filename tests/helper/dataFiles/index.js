import fs from 'fs';
import ProcessDataBroker from "../../../src/data/broker/processData.js";

const roomData = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const opts = {
  username: "username",
  room: "room",
  shard: "shard",
  tick: 0,
  type: "owned"
}
const stats = await ProcessDataBroker.single({ roomData, opts });
console.log(stats);
