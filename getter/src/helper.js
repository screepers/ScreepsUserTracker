import axios from "axios";


async function getProxies(pageSize, pageIndex) {
  const proxiesResponse = await axios.get(
    `https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=${pageIndex}&page_size=100`,
    {
      headers: {
        Authorization: `Token ${process.env.WEBSHARE_TOKEN}`,
      },
    }
  );
  return proxiesResponse.data.results;
}

// eslint-disable-next-line import/prefer-default-export
export async function getAllProxies() {
  try {
    const targetProxiesCount = Number(process.env.WEBSHARE_PROXYAMOUNT);
    const maxPageIndex = Math.ceil(targetProxiesCount / 100);

    let proxies = []
    for (let p = 1; p < maxPageIndex + 1; p += 1) {
      proxies = proxies.concat(await getProxies(100, p));
    }

    console.log(`Loaded ${proxies.length} proxies`);
    return proxies;
  } catch (error) {
    return [];
  }
}
