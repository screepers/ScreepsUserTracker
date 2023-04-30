import DataRequestBroker from './dataRequestBroker.js'

const rooms = []
for (let x = 0; x < 50; x++) {
    for (let y = 0; y < 50; y++) {
        rooms.push(`E${x}N${y}`)
    }
}
const dataRequestBroker = new DataRequestBroker({"shard0": rooms})

setInterval(() => {
    console.log(dataRequestBroker.getDataResults().length, dataRequestBroker.getDataRequests().length)
},1000)



