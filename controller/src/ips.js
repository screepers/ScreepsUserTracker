import fs from "fs";
import axios from "axios";
import express from "express";
import { ownedLogger as logger } from "./logger.js";

const DEBUG = process.env.DEBUG === "TRUE";
const settings = {
  serverType: process.env.SERVER_TYPE,
  debug: DEBUG,
};

function getIps() {
  return fs.existsSync("./files/ips.json")
    ? JSON.parse(fs.readFileSync("./files/ips.json"))
    : [];
}

async function ipIsOnline(ip) {
  try {
    await axios.post(`${ip}/api/ping`, settings);
  } catch (error) {
    return false;
  }

  return true;
}
function removeIp(ip) {
  const ips = getIps().filter((i) => i !== ip);
  fs.writeFileSync("./files/ips.json", JSON.stringify(ips, null, 2));
}

export async function removeAllOfflineIps() {
  const ips = getIps();
  for (let i = 0; i < ips.length; i += 1) {
    const ip = ips[i];
    if (!(await ipIsOnline(ip))) {
      removeIp();
      logger.info(`Removed ${ip} from ips.json because it was offline!`);
    }
  }
}

export function getRoomsPerCycle() {
  const ips = getIps();
  const proxyCount = Number(process.env.WEBSHARE_PROXYAMOUNT) || 0;
  // tickSpeed * ticksPerCall * callsPerSecond
  const roomsPerIp = 4 * 100 * 2;
  const roomsPerCycle = roomsPerIp * ((ips.length + proxyCount) || 1);
  return roomsPerCycle;
}

export function IpRouter() {
  const router = new express.Router();

  router.post("/ip", async (req, res) => {
    try {
      const ips = getIps();
      const { ip } = req.body;
      const ipOnline = await ipIsOnline(ip);
      if (!ipOnline) {
        logger.info(`${req.ip}: Failed to register with controller! ${ip}`);
        res.status(400).json("Failed to register with controller!");
        return;
      }

      if (ips.includes(ip)) {
        logger.info(`${req.ip}: Already added! ${ip}`);
        res.json("Already added");
        return;
      }

      logger.info(`${req.ip}: Added! ${ip}`);
      ips.push(ip);
      fs.writeFileSync("./files/ips.json", JSON.stringify(ips, null, 2));
      res.json("Success");
    } catch (e) {
      logger.error(`${e.message}\nStack of ${e.stack}`);
      res.status(500).json("Failed to register with controller!");
    }
  });

  router.delete("/ip", async (req, res) => {
    try {
      const { ip } = req.body;
      removeIp(ip);
      logger.info(`${req.ip}: Deleted! ${ip}`);
      res.json("Success");
    } catch (error) {
      logger.info(error);
      res.json("Failed to delete ip!");
    }
  });

  return router;
}
