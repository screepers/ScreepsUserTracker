import ScreepsApi from './api.js';
import GetRooms from './getRooms.js'

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default class DataRequestBroker {
    dataRequests = [];
    dataResults = [];

    constructor(rooms) {
        new GetRooms(rooms, this).sync()
        this.executeSingle()
    }
    addDataRequests(dataRequests) {
        this.dataRequests = this.dataRequests.concat(dataRequests);
    }
    getDataRequest() {
        return this.dataRequests.shift();
    }
    getDataRequests() {
        return [...this.dataRequests];
    }

    addDataResult(dataResult) {
        this.dataResults.push(dataResult);
    }
    getDataResults() {
        const dataResults = [...this.dataResults];
        this.dataResults = [];
        return dataResults;
    }

    async executeSingle() {
        const dataRequest = this.getDataRequest();
        if (!dataRequest) {
            await wait(100);
            return this.executeSingle();
        }

        const dataResult = await ScreepsApi.roomHistory(dataRequest)
        this.addDataResult(dataResult);
        return this.executeSingle();
    }
}