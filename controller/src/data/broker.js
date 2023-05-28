import graphite from "graphite";
import winston from "winston";
import * as dotenv from "dotenv";

dotenv.config();
const client = graphite.createClient(
  `plaintext://${process.env.GRAPHITE_HOST}/`
);

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: "logs/graphite.log" })],
  });
  
  if (process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
  }

export default class DataBroker {
  static _users = {};

  static Reset() {
    this._users = {};
  }

  static AddRooms(username, shard, rooms) {
    if (!this._users[username]) {
      this._users[username] = {};
    }
    if (!this._users[username][shard]) {
      this._users[username][shard] = {};
    }

    rooms.forEach((roomName) => {
      if (!this._users[username][shard][roomName])
        this._users[username][shard][roomName] = undefined;
    });
  }

  static AddRoomData(username, shard, roomName, data) {
    if (this._users[username]) return;
    if (this._users[username][shard]) return;
    if (this._users[username][shard][roomName]) return;

    this._users[username][shard][roomName] = data;
    }

  static CheckUsers() {
    Object.entries(this._users).forEach(([username, shards]) => {
      let hasUndefinedData = false;

      Object.values(shards).forEach((rooms) => {
        Object.values(rooms).forEach((roomData) => {
          hasUndefinedData = roomData !== undefined;
        });
      });

        if (!hasUndefinedData) {
            this.UploadData(username);
        }
    });

    
}
static UploadStatus(status) {
  const stats = {};
  Object.entries(usersStats).forEach(([username, userStats]) => {
    stats[username] = { overview: { roomCounts: userStats }, shards: {} };
  });
    this.Upload({ status });
}
static UploadUser(username) {

}
static Upload(data, timestamp) {
    const _timestamp = timestamp || Date.now();

    if (process.env.GRAPHITE_ONLINE === "FALSE") return;
    client.write(data, _timestamp, (err) => {
      if (err) {
        logger.error(err);
      }
    });
}
}
