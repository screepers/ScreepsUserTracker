import ScreepsApi from './api.js';

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export default class RoomRequests {
    lastTickTimes = {}
    shards = ["shard0", "shard1","shard2","shard3"]
    rooms = {}
    DataRequestBroker = null

    constructor(rooms, DataRequestBroker) {
        this.rooms = rooms;
        this.DataRequestBroker = DataRequestBroker;
    }

    async getCurrentTick(shard) {
        const tick = await ScreepsApi.gameTime({shard})
        if (tick) {
            return tick;
        }

        return this.lastTickTimes[shard]
    }

    async sync() {
        for (let i = 0; i < this.shards.length; i++) {
            const shard = this.shards[i];

            const dataRequests = [];
            const currentTick = await this.getCurrentTick(shard);
            let requestTick = (currentTick - currentTick % 100) - 500;

            if (requestTick - 100  > this.lastTickTimes[shard]) {
                requestTick = this.lastTickTimes[shard] + 100;
            }
            else if (requestTick === this.lastTickTimes[shard]) {
                continue;
            }

            const rooms = this.rooms[shard] || [];
            rooms.forEach(room => {
                const dataRequest = {
                    room: room,
                    shard: shard,
                    tick: requestTick
                }
                dataRequests.push(dataRequest);
            })
            this.DataRequestBroker.addDataRequests(dataRequests);
            this.lastTickTimes[shard] = requestTick;
        }

        await wait(1000*1);
        return this.sync();
    }
}