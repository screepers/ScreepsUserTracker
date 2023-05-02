import DataRequestBroker from "./dataRequestBroker.js";

const dataRequestBroker = new DataRequestBroker();

setInterval(() => {
  console.log(
    dataRequestBroker.getDataResults().length,
    dataRequestBroker.getDataRequests().length
  );
}, 1000);
