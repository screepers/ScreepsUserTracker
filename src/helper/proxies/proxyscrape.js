const PROXYSCRAPE_TOKEN = process.env.PROXYSCRAPE_TOKEN;
import { UploadStatus } from "../../data/upload.js";
import { CronJob } from "cron";
import axios from "axios";

async function getProxies() {
  try {
    const url = `https://api.proxyscrape.com/v2/account/datacenter_shared/proxy-list?protocol=http&auth=${PROXYSCRAPE_TOKEN}&type=getproxies&country[]=de&format=normal&status=all`;
    const response = await axios.get(url);
    const { data } = response;

    const results = data.split("\r\n").filter((proxy) => proxy.length > 0);
    const proxyList = results.map((proxy) => {
      const [ip, port] = proxy.split(":");
      return {
        ip,
        port,
      };
    });
    return proxyList;
  } catch (error) {
    return []
  }
}

export async function getProxiesList() {
  return await getProxies();
}

export default function getProxy(index) {
  return proxyList[index];
}