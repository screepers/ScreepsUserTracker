const WEBSHARE_TOKEN = process.env.WEBSHARE_TOKEN;
import { UploadStatus } from "../data/upload.js";
import { CronJob } from "cron";
import axios from "axios";

async function getProxies(page) {
  try {
    const url = `https://proxy.webshare.io/api/proxy/list/?page=${page}`;
    const headers = {
      Authorization: `Token ${WEBSHARE_TOKEN}`,
    };
    const response = await axios.get(url, { headers });
    const { data } = response;
    const { results } = data;
    return results;
  } catch (error) {
    return []
  }
}

const proxyList = await getProxies(1)

export default function getProxy(index) {
  return proxyList[index];
}

async function downloadAndUploadProxyStatistics() {
  try {
    // it requires in the query the timestamp_lte and timestamp_gte an do it in a string like 2022-09-09T23:34:00.095501-07:00
    const timestamp_lte = new Date().toISOString();
    const timestamp_gte = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 31).toISOString();
    const url = `https://proxy.webshare.io/api/v2/stats/aggregate?timestamp__lte=${timestamp_lte}&timestamp__gte=${timestamp_gte}`;
    const headers = {
      Authorization: `Token ${WEBSHARE_TOKEN}`,
    };
    const response = await axios.get(url, { headers });
    const { data } = response;
    await UploadStatus({ proxyStats: data });
  } catch (error) {
    console.error(error);
  }
}

const proxyStaticisticsDownloader = new CronJob(
  "* * * * *",
  downloadAndUploadProxyStatistics,
  null,
  false,
  "Europe/Amsterdam"
);
if (WEBSHARE_TOKEN && WEBSHARE_TOKEN.length > 0) proxyStaticisticsDownloader.start();