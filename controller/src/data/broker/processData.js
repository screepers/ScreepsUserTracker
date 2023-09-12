import handleOwnedObjects from "../handle/custom/objects.js";
import handleReservedObjects from "../../handle/custom/reservedRoom.js";

import { GetUsername } from "../../../rooms/userHelper.js";
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

            tickRates[dataRequest.shard] = this.lastTickTimestamp[
                dataRequest.shard
            ]
                ? Math.round(
                    (dataResult.timestamp -
                        this._lastTickTimestamp[dataRequest.shard]) /
                    100
                )
                : undefined;

            this.lastTickTimestamp[dataRequest.shard] = dataResult.timestamp;
        }
    }

    static single(type, roomData) {
        const { dataResult, dataRequest } = roomData;

        this.setTickRate(dataRequest, dataResult);

        let actionsArray = [];
        const { ticks } = dataResult;
        const tickKeys = Object.keys(ticks);

        const originalObjects = Object.values(ticks).filter(
            (tl) => tl !== null
        )[0];

        let handleObjects = null;
        switch (type) {
            case "owned":
                handleObjects = handleOwnedObjects;
                break;
            case "reserved":
                handleObjects = handleReservedObjects;
                break;
            default:
                break;
        }

        if (!timestamp) {
            timestamp = dataResult.timestamp;
        }

        tickKeys.forEach((tick, index) => {
            if (ticks[tick]) {
                actionsArray = actionsArray.concat(
                    handleObjects(username, ticks[tick], {
                        previousObjects: ticks[tickKeys[index - 1]],
                        originalObjects,
                        ticks,
                        tick,
                        type,
                        isFirstTick: index === 0,
                        shard: dataRequest.shard,
                    })
                );
            }
        });

        if (process.env.CHECK_FOR_NEW_ACTIONS === "TRUE") FindNewDefaultActions(actionsArray, type);

        const stats = getStats(actionsArray);
        const username = GetUsername(dataRequest.room, dataRequest.shard)
        switch (type) {
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