import ProcessDataBroker from "../data/broker/processData.js";
import { GetRoomHistory } from "./screepsApi.js";
import getProxy from "../helper/proxy.js";

export default async function process(opts, proxyIndex) {
  let proxy = null;
  if (proxyIndex !== undefined) {
    proxy = await getProxy(proxyIndex);
  }
  const dataResult = await GetRoomHistory(proxy, opts.shard, opts.room, opts.tick);
  if (dataResult.status === "Success") {
    const { data } = dataResult;
    if (opts.username) {
      opts.timestamp = data.timestamp;
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
  return process(opts, proxyIndex);
}