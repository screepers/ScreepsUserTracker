import http.client
import httpx
import os
import requests
import json
import aiohttp
from urllib.parse import urlparse

PROXYSCRAPE_TOKEN  = os.getenv('PROXYSCRAPE_TOKEN')

from logger import Logger
proxy_logger = Logger("proxy_handler")

def fetch_proxies():
    if not PROXYSCRAPE_TOKEN:
        raise ValueError("No PROXYSCRAPE_TOKEN provided")

    api_url = f"https://api.proxyscrape.com/v2/account/datacenter_shared/proxy-list?protocol=http&auth={PROXYSCRAPE_TOKEN}&type=getproxies&country[]=de&format=normal&status=all"

    parsed_url = urlparse(api_url)
    host = parsed_url.netloc
    path = parsed_url.path + "?" + parsed_url.query

    conn = http.client.HTTPSConnection(host)
    conn.request("GET", path)
    response = conn.getresponse()
    response_data = response.read().decode()
    conn.close()

    proxies = response_data.split('\r\n')
    proxies = [f"http://{proxy}" for proxy in proxies if proxy]

    return proxies

def get_proxies():
    proxies = fetch_proxies()
    proxy_logger.info(f"Fetched {len(proxies)} proxies")
    return proxies
    
# async def make_screeps_history_request(url, proxy):
    # proxies = {
    #     "http": proxy,
    #     "https": proxy
    # }
    
    # try:
    #     response = requests.get(url, proxies=proxies)
    #     json_data = response.json()
    #     return {'status_code': response.status_code, 'data':json_data}

    # except Exception as e:
    #     if 'response' in locals():
    #         status_code = response.status_code
    #         if status_code == 200:
    #             status_code = 500
    #     else:
    #         status_code = None
            
    #     proxy_logger.error(f"Error making request to {url} via proxy {proxy}: {e}")
    #     return {'status_code': status_code, 'data':None}
    
    
# async def make_screeps_history_request(url, proxy):
#     proxies = {
#         "http://": proxy,
#         "https://": proxy
#     }
    
#     async with httpx.AsyncClient(proxies=proxies) as client:
#         try:
#             response = await client.get(url)
#             json_data = response.json()
#             return {'status_code': response.status_code, 'data': json_data}
        
#         except Exception as e:
#             status_code = response.status_code if 'response' in locals() else None
#             proxy_logger.error(f"Error making request to {url} via proxy {proxy}: {e}")
#             return {'status_code': status_code, 'data': None}

async def make_screeps_history_request(url, proxy):
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, proxy=proxy) as response:
                json_data = await response.json()
                return {'status_code': response.status, 'data': json_data}
        
        except Exception as e:
            status_code = response.status if 'response' in locals() else None
            proxy_logger.error(f"Error making request to {url} via proxy {proxy}: {e}")
            return {'status_code': status_code, 'data': None}