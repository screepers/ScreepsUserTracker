

from dotenv import load_dotenv
load_dotenv()
from proxy_handler import get_proxies, make_screeps_history_request
from multiprocessing.dummy import Pool
import time
import asyncio


import os
MAX_THREADS  = os.getenv('MAX_THREADS')
if not MAX_THREADS:
    raise ValueError("No MAX_THREADS provided")
MAX_THREADS = int(MAX_THREADS)

# 119KB
proxies = get_proxies()
urls = []
url = "https://screeps.com/room-history/shard0/E67N17/61400100.json"
for i in range(0, 1000):
    urls.append(url)

results = []
proxies_per_thread = {}
urls_per_thread = {}


for i, proxy in enumerate(proxies):
    thread = i % MAX_THREADS
    proxies_per_thread[thread] = proxies_per_thread.get(thread, []) + [proxy]
for i, url in enumerate(urls):
    thread = i % MAX_THREADS
    urls_per_thread[thread] = urls_per_thread.get(thread, []) + [url]

async def proxy_worker(proxy, urls, results):
    for index, url in enumerate(urls):
        result = await make_screeps_history_request(url, proxy)
        results.append(result)
        print(f"{index}: Processed {url} via {proxy} with result {result['status_code']}")
    return results

def worker(data):
    thread_proxies = data['thread_proxies']
    thread_urls = data['thread_urls']
    
    urls_per_proxy = {}
    proxy_count = len(thread_proxies)
    for i, url in enumerate(thread_urls):
        proxy = i % proxy_count
        urls_per_proxy[proxy] = urls_per_proxy.get(proxy, []) + [url]
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
      
    results = []
    tasks = [loop.create_task(proxy_worker(proxy, urls_per_proxy[index], results)) for index, proxy in enumerate(thread_proxies)]
    loop.run_until_complete(asyncio.wait(tasks))
    loop.close()
    
    return results

pool = Pool(MAX_THREADS)

  
start_time = time.time()

thread_results = pool.map(worker, [{'thread_proxies': proxies_per_thread[i], 'thread_urls': urls_per_thread[i]} for i in range(MAX_THREADS)])

results = [result for thread_result in thread_results for result in thread_result]

end_time = time.time()

total_execution_time = end_time - start_time

print(f"Total execution time: {total_execution_time} seconds")