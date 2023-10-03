import "dotenv/config";
import { ScreepsAPI } from "screeps-api";
import axios from "axios";
import postgres from "postgres";

let api = null
let sql = null;

async function init() {
  sql = postgres({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: 'postgres',
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  })

  api = new ScreepsAPI({
    protocol: process.env.PRIVATE_SERVER_PROTOCOL,
    hostname: process.env.PRIVATE_SERVER_HOST,
    port: process.env.PRIVATE_SERVER_PORT,
    path: "/"
  });
  await api.auth(
    process.env.PRIVATE_SERVER_USERNAME,
    process.env.PRIVATE_SERVER_PASSWORD
  );
}

async function getAdminUtilsStats() {
  try {
    const response = await axios.get(`${process.env.PRIVATE_SERVER_PROTOCOL}://${process.env.PRIVATE_SERVER_HOST}:${process.env.PRIVATE_SERVER_PORT}/stats`);
    const { data } = response;

    const users = {}
    data.users.forEach(user => {
      users[user.username] = user;
    });
    data.users = users;

    return { data };
  } catch (error) {
    return { error: error.message };
  }
}

export default async function start() {
  await init();
  await api.socket.connect(); // connect socket

  // Subscribe to 'cpu' endpoint and get events
  api.socket.subscribe('room:W1N1');
  api.socket.on('room:W1N1', async () => {
    try {
      const { data, error } = await getAdminUtilsStats();
      if (error) return;

      await sql`INSERT INTO public.admin_utils_data ${sql({ data, tick: data.gametime }, 'data', 'tick')}`;
    } catch (error) {
      // console.log(error);
    }
  });
}

