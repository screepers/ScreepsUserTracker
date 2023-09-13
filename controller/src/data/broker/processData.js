import handleOwnedObjects from "../handle/custom/objects.js";
import handleReservedObjects from "../handle/custom/reservedRoom.js";

import { GetUsername } from "../../rooms/userHelper.js";
import {
    getStats,
    FindNewDefaultActions,
} from "../handle/helper.js";
import OwnedDataBroker from "./custom/owned.js";
import ReservedDataBroker from "./custom/reserved.js";

export default class ProcessDataBroker {
    static lastTickTimestamp = {};
    static tickRates = {};

    static setTickRate(dataRequest, dataResult) {
        if (!this.tickRates[dataRequest.shard]) {
            this.tickRates[dataRequest.shard] = dataRequest.tick;

            this.tickRates[dataRequest.shard] = this.lastTickTimestamp[
                dataRequest.shard
            ]
                ? Math.round(
                    (dataResult.timestamp -
                        this.lastTickTimestamp[dataRequest.shard]) /
                    100
                )
                : undefined;

            this.lastTickTimestamp[dataRequest.shard] = dataResult.timestamp;
        }
    }

    static single(roomData) {
        const { dataResult, dataRequest } = roomData;

        this.setTickRate(dataRequest, dataResult);

        let actionsArray = [];
        const { ticks } = dataResult;
        const tickKeys = Object.keys(ticks);

        const originalObjects = {}
        for (const tick in ticks) {
            if (Object.hasOwnProperty.call(ticks, tick)) {
                const tickList = ticks[tick];
                for (const objectId in tickList) {
                    if (Object.hasOwnProperty.call(tickList, objectId)) {
                        const object = tickList[objectId];
                        if (!originalObjects[objectId]) originalObjects[objectId] = object;
                    }
                }
            }
        }

        let handleObjects = null;
        switch (dataRequest.type) {
            case "owned":
                handleObjects = handleOwnedObjects;
                break;
            case "reserved":
                handleObjects = handleReservedObjects;
                break;
            default:
                break;
        }

        const username = GetUsername(dataRequest.room, dataRequest.shard)
        for (let t = 0; t < tickKeys.length; t++) {
            const tick = tickKeys[t];
            if (ticks[tick]) {
                actionsArray = actionsArray.concat(
                    handleObjects(username, ticks[tick], {
                        previousObjects: ticks[tickKeys[t - 1]],
                        originalObjects,
                        ticks,
                        tick,
                        type: dataRequest.type,
                        isFirstTick: t === 0,
                        shard: dataRequest.shard,
                    })
                );
            }
        };

        if (process.env.CHECK_FOR_NEW_ACTIONS === "TRUE") FindNewDefaultActions(actionsArray, dataRequest.type);
        if (process.env.TESTING === "TRUE") return;

        const stats = getStats(actionsArray);
        switch (dataRequest.type) {
            case "owned":
                OwnedDataBroker.AddRoomData(username, dataRequest.shard, dataRequest.room, { stats, tick: dataRequest.tick, timestamp: dataResult.timestamp });
                break;
            case "reserved":
                ReservedDataBroker.AddRoomData(username, dataRequest.shard, dataRequest.room, { stats, tick: dataRequest.tick, timestamp: dataResult.timestamp });
                break;
            default:
                break;
        }
    }
}