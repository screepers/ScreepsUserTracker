import axios from 'axios';

export default class ScreepsApi {
    static async execute(options) {
        const errorOr = {error: null, result: null}
        try {
            const response = await axios.request(options);
            errorOr.result = response.data;
        } catch (error) {
            errorOr.error = error;
        }
        finally {
            return errorOr;
        }
    }

    static async gameTime(dataRequest) {
        const options = {
            method: 'GET',
            url: `https://screeps.com/api/game/time?shard=${dataRequest.shard}`,
        }
        
        const response = await this.execute(options);
        if (response.result) {
            return response.result.time;
        }
        return null;
    }

    static async roomHistory(dataRequest) {
        const options = {
            method: 'GET',
            url: `https://screeps.com/room-history/${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick}.json`,
        }
        
        const response = await this.execute(options);
        if (response.result) {
            return response.result;
        }
        return null;
    }
}