import { GetRoomHistory } from "./screepsApi.js";

export default async function process(opts) {
  const dataResult = await GetRoomHistory(null, opts.shard, opts.room, opts.tick);
  if (dataResult.status === "Success") {
    const { data } = dataResult;
    // if (!opts.username) {
    // }
    opts.data = data;
    return {
      status: "Success",
    }
  }
  else if (opts.failed) {
    return {
      status: "Failed",
    };
  }
  else {
    opts.failed = true;
    return await this.process(opts);
  }
}