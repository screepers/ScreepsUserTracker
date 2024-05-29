

from dotenv import load_dotenv
load_dotenv()
from proxy_handler import get_proxies, make_screeps_history_request
from concurrent.futures import ThreadPoolExecutor, as_completed
from queue import Queue
from itertools import cycle
import math
import time

import os
MAX_THREADS  = os.getenv('MAX_THREADS')
if not MAX_THREADS:
    raise ValueError("No MAX_THREADS provided")
MAX_THREADS = int(MAX_THREADS)

# 119KB
urls = []
url = "https://screeps.com/room-history/shard0/E67N17/61400100.json"
for i in range(0, 1000):
    urls.append(url)

resultDict = {}

proxies = get_proxies()


# pool = ThreadPool(MAX_THREADS)
# results = pool.map(lambda proxy: make_screeps_history_request(url, proxy), proxies)

def process_proxy(proxy, urls):
    results = []
    for url in urls:
        # Your logic here, e.g., fetch url using proxy
        result = (proxy, url)  # Replace with actual result
        results.append(result)
    return results

def execute_thread(data):
    proxies, urls = data
    results = []
    proxy_count = len(proxies)
    
    urls_per_proxy = {}
    for i, url in enumerate(urls):
        proxy = proxies[i % proxy_count]
        urls_per_proxy[proxy] = urls_per_proxy.get(proxy, []) + [url]
        
    for proxy, urls in urls_per_proxy.items():
        for url in urls:
            status_code, result = make_screeps_history_request(url, proxy)
            if status_code == 200:
                results.append(result)
    return results

def fetch_with_proxies(urls, proxies):
    results = []
    proxies_per_thread = {}
    urls_per_thread = {}
    for i, proxy in enumerate(proxies):
        thread = i % MAX_THREADS + 1
        proxies_per_thread[thread] = proxies_per_thread.get(thread, []) + [proxy]
    for i, url in enumerate(urls):
        thread = i % MAX_THREADS + 1
        urls_per_thread[thread] = urls_per_thread.get(thread, []) + [url]

    pool = ThreadPool(MAX_THREADS)
    thread_data = [(proxies_per_thread.get(thread, []), urls_per_thread.get(thread, [])) for thread in range(1, MAX_THREADS + 1)]
    results = pool.map(execute_thread, thread_data)
    
    return results

t0 = time.time()
results = fetch_with_proxies(urls, proxies)
t1 = time.time()
total = t1-t0
for status_code in results:
    print(f"Status Code: {status_code}")

while True:
    # took ... ms
    t0 = time.time()
    status_code, result = make_screeps_history_request(url)
    t1 = time.time()

    total = t1-t0

    status_code_str = str(status_code)
    resultDict[status_code_str] = resultDict.get(status_code_str, 0) + 1

    print(total)    
    for key, value in resultDict.items():
        print(key, value)
        
result = make_screeps_history_request(url)

# try:
# except Exception as e:
#     print(e)