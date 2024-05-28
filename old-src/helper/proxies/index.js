import { getProxiesList as getProxiesListWebshare } from "./webshare.js";
import { getProxiesList as getProxiesListProxyscrape } from "./proxyscrape.js";

let proxyList = [];

async function getProxiesList() {
  if (process.env.WEBSHARE_TOKEN !== undefined) {
    proxyList = await getProxiesListWebshare();
  }
  else if (process.env.PROXYSCRAPE_TOKEN !== undefined) {
    proxyList = await getProxiesListProxyscrape();
  }
}

getProxiesList();

export default function getProxy(index) {
  return proxyList[index];
}