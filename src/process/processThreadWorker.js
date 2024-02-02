import { ThreadWorker } from "poolifier"
import ProcessDataBroker from "../data/broker/processData.js";

export default new ThreadWorker(
  async (data) => await ProcessDataBroker.single(data),
  {
    async: true
  }
);
