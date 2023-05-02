import express from "express";
import bodyParser from "body-parser";
import DataRequestBroker from "./dataRequestBroker.js";

const dataRequestBroker = new DataRequestBroker();
const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.put("/rooms", (req, res) => {
  const rooms = req.body;
  dataRequestBroker.forceUpdateRooms(rooms);
  res.json("Success");
});
app.get("/data", (req, res) => {
  const results = dataRequestBroker.getDataResults();
  const activeRequests = dataRequestBroker.getDataRequests();
  const rooms = dataRequestBroker.getRooms();
  return res.json({ results, activeRequests, rooms });
});

app.listen(port, () => console.log(`API listening on port ${port}`));

setInterval(() => {
  console.log(
    dataRequestBroker.getDataResults(false).length,
    dataRequestBroker.getDataRequests().length
  );
}, 5000);
