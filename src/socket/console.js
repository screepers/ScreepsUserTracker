import { ScreepsAPI } from "screeps-api"
import axios from "axios"
import { socketLogger as logger } from '../helper/logger.js'
import { UploadAdminUtils } from "../data/upload.js";

if (process.env.PRIVATE_SERVER_USERNAME) {
  const api = new ScreepsAPI({
    token: process.env.SCREEPS_TOKEN,
    protocol: process.env.PRIVATE_SERVER_PROTOCOL || "https",
    hostname: process.env.PRIVATE_SERVER_HOST || "screeps.com",
    port: process.env.PRIVATE_SERVER_PORT || 443,
  });
  await api.auth(
    process.env.PRIVATE_SERVER_USERNAME,
    process.env.PRIVATE_SERVER_PASSWORD
  );

  const url = `${process.env.PRIVATE_SERVER_PROTOCOL}://${process.env.PRIVATE_SERVER_HOST}:${process.env.PRIVATE_SERVER_PORT}`

  api.socket.connect()
  api.socket.on('connected', () => {
    console.log('Connected to socket')
  })

  api.socket.subscribe('console')
  api.socket.on('console', async (event) => {
    try {
      const { data } = await axios.get(`${url}/stats`);

      const users = {}
      data.users.forEach(user => {
        users[user.username] = user;
      });
      data.users = users;

      UploadAdminUtils(data);
    } catch (error) {
      logger.error(error)
    }
  })
}
