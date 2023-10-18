import axios from "axios";
import DataRequestBroker from "./dataRequestBroker.js";

async function getProxies(pageSize, pageIndex) {
  const proxiesResponse = await axios.get(
    `https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=${pageIndex}&page_size=${pageSize}`,
    {
      headers: {
        Authorization: `Token ${process.env.WEBSHARE_TOKEN}`,
      },
    }
  );
  return proxiesResponse.data.results;
}

// eslint-disable-next-line import/prefer-default-export
async function getAllProxies() {
  try {
    const targetProxiesCount = Number(process.env.WEBSHARE_PROXYAMOUNT);

    let proxies = []
    for (let p = 1; p < 2; p += 1) {
      proxies = proxies.concat(await getProxies(targetProxiesCount, p));
    }

    console.log(`Loaded ${proxies.length} proxies`);
    return proxies;
  } catch (error) {
    return [];
  }
}


export default class LocalDataRequestBroker {
  static async start() {
    const proxies = await getAllProxies();
    for (let p = 0; p < proxies.length; p += 1) {
      const proxy = proxies[p];
      const broker = new DataRequestBroker(proxy);
      broker.executeSingle();
    }
    if (proxies.length === 0) {
      const broker = new DataRequestBroker();
      broker.executeSingle();
    }
  }
}