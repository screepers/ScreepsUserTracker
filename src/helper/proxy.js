const WEBSHARE_TOKEN = process.env.WEBSHARE_TOKEN;
import axios from "axios";

let lastProxyIndex = 0;
let maxProxyIndex = process.env.WEBSHARE_PROXYAMOUNT || 0;

async function getProxies(page) {
  const url = `https://proxy.webshare.io/api/proxy/list/?page=${page}`;
  const headers = {
    Authorization: `Token ${WEBSHARE_TOKEN}`,
  };
  const response = await axios.get(url, { headers });
  const { data } = response;
  const { results } = data;
  return results;
}

const proxyList = await getProxies(1)

export default function getProxy() {
  if (lastProxyIndex >= maxProxyIndex) {
    lastProxyIndex = 0;
  }

  return proxyList[lastProxyIndex++];
}