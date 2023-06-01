import axios from "axios";
import { apiLogger as logger} from "./logger.js"

export default class ScreepsApi {
  static async execute(options) {
    const errorOr = { error: null, result: null };
    try {
      const response = await axios.request(options);
      errorOr.result = response.data;
      logger.debug({
        options,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (error) {
      errorOr.error = error;

      // only log other status codes then 404, 429
      const { response } = error;
      if (response) {
        const { status } = response;
        if (status !== 404 && status !== 429) {
          logger.error(error);
        }
      } else logger.error(error);
    }
    return errorOr;
  }

  static async gameTime(dataRequest) {
    const options = {
      method: "GET",
      url: `https://screeps.com/api/game/time?shard=${dataRequest.shard}`,
    };

    const response = await this.execute(options);
    if (response.result) {
      return response.result.time;
    }
    return null;
  }

  static async roomHistory(dataRequest) {
    const options = {
      method: "GET",
      url: `https://screeps.com/room-history/${dataRequest.shard}/${dataRequest.room}/${dataRequest.tick}.json`,
    };

    const response = await this.execute(options);
    if (response.result) {
      return response.result;
    }
    return null;
  }
}
