import * as dotenv from "dotenv";
dotenv.config();
import { GetGameTime } from "../screepsApi.js";
import fs from "fs"

const shards = process.env.SHARDS.split(' ');
const dataTypes = process.env.DATA_TYPES.split(' ');
const roomsCheckedFolderPath = "./files"
const roomsCheckedPath = roomsCheckedFolderPath + "/roomsBeingChecked.json";
const requestsFolderPath = "./files"
const requestsPath = roomsCheckedFolderPath + "/requests.json";

function wait(ms) {
    // eslint-disable-next-line no-promise-executor-return
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

export default class DataRequestsBroker {
    requests;
    roomsBeingChecked;
    lastTickTimes = {}

    async constructorAsync() {
        this.requests = this.getRequests();
        this.roomsBeingChecked = this.getRoomsBeingChecked();
        for (let dt = 0; dt < dataTypes.length; dt++) {
            const dataType = dataTypes[dt];
            this.lastTickTimes[dataType] = {};
            for (let s = 0; s < shards.length; s++) {
                const shard = shards[s];
                this.lastTickTimes[dataType][shard] = Number(process.env[`START_FROM_TICK_${dataType}`]) || await GetGameTime(shard);
            }
        }

        this.syncRequests()
    }

    getRoomsBeingChecked() {
        if (fs.existsSync(roomsCheckedPath)) {
            return JSON.parse(fs.readFileSync(roomsCheckedPath))
        }
        return {};
    }
    saveRoomsBeingChecked(rooms) {
        fs.mkdirSync(roomsCheckedFolderPath, { recursive: true })
        fs.writeFileSync(roomsCheckedPath, JSON.stringify(rooms));

        this.roomsBeingChecked = rooms;
    }

    getRequests() {
        if (fs.existsSync(requestsPath)) {
            return JSON.parse(fs.readFileSync(requestsPath))
        }
        return [];
    }
    saveRequests() {
        fs.mkdirSync(requestsFolderPath, { recursive: true })
        fs.writeFileSync(requestsPath, JSON.stringify(this.requests));
    }

    getRequestsToSend(count) {
        const requestsToSend = [];
        for (let i = 0; i < count; i++) {
            const request = this.requests.shift()
            if (!request) break;
            requestsToSend.push(request);
        }

        this.saveRequests()
        return requestsToSend
    }

    async getCurrentTick(type, shard) {
        await wait(500);
        const tick = await GetGameTime(shard);
        if (tick) {
            return tick;
        }

        return this.lastTickTimes[type][shard] || 0;
    }

    async syncRequests() {
        for (let i = 0; i < shards.length; i += 1) {
            const shard = shards[i];

            const types = Object.keys(this.roomsBeingChecked);
            for (let t = 0; t < types.length; t++) {
                const type = types[t];
                const currentTick = await this.getCurrentTick(type, shard);
                let requestTick = Math.max(currentTick - (currentTick % 100) - 1000, 0);

                const rooms = this.roomsBeingChecked[type][shard];
                if (rooms && rooms.length > 0) {
                    if (
                        this.lastTickTimes[type][shard] !== undefined &&
                        requestTick - 100 > this.lastTickTimes[type][shard]
                    ) {
                        requestTick = this.lastTickTimes[type][shard] + 100;
                    }

                    if (this.lastTickTimes[type][shard] !== requestTick) {
                        rooms.forEach((room) => {
                            const dataRequest = {
                                room,
                                shard,
                                tick: requestTick,
                                type,
                            };
                            this.requests.push(dataRequest);
                        });
                        this.lastTickTimes[type][shard] = requestTick;
                    }
                }
            };
        }

        this.saveRequests();
        if (this.requests.length === 0) {
            await wait(60 * 1000);
        }
        this.syncRequests();
    }
}