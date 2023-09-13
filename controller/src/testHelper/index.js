import fs from "fs";
import ProcessDataBroker from "../data/broker/processData";

const roomsData = []
const files = fs.readdirSync('./src/testHelper/files')
files.forEach(file => {
    const dataResult = JSON.parse(fs.readFileSync(`./src/testHelper/files/${file}`, 'utf8'))
    const dataRequest = {
        shard: "shard1",
        room: "room1",
        type: "owned",
        tick: 100,
    }
    roomsData.push({ dataResult, dataRequest })
})


const start = Date.now()
roomsData.forEach(roomData => {
    ProcessDataBroker.single(roomData)
})
const end = Date.now()
console.log(`Time per request: ${Math.round((end - start) / roomsData.length)}ms`)