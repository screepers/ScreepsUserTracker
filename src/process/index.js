import ProcessDataBroker from "../data/broker/processData.js";
import { startSpan, finish } from "../setup/tracer.js";
import { GetRoomHistory } from "./screepsApi.js";

export default async function process(opts) {
  const span = startSpan('getHistory');
  const dataResult = await GetRoomHistory(null, opts.shard, opts.room, opts.tick);
  finish(span)
  if (dataResult.status === "Success") {
    const { data } = dataResult;
    if (opts.username) {
      opts.data = await ProcessDataBroker.single(data, opts);;
    }
    return {
      status: "Success",
    }
  }
  if (opts.failed) {
    return {
      status: "Failed",
    };
  }

  opts.failed = true;
  return process(opts);
}