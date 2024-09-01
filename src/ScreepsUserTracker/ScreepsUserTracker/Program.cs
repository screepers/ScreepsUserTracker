using API;
using Shared.Models;
using System.Diagnostics;

var proxies = Proxies.GetProxies();

// 119KB
var url = "https://screeps.com/room-history/shard0/E67N17/61400100.json";
var proxyUrl2= "178.208.183.112:3128";
var result = await ScreepsAPI.GetScreepsHistory(0, url, proxyUrl2);
Console.WriteLine($"Status Code: {result.StatusCode}");
Console.WriteLine($"Is Success: {result.IsSuccessStatusCode}");

Stopwatch stopwatch = new Stopwatch();

stopwatch.Start();

List<Task<HttpResponseResult>> tasks = new List<Task<HttpResponseResult>>();
//for (int i = 0; i < proxies.Count; i++)
for (int i = 0; i < 240; i++)
    {
        var proxyUrl = proxies[i];
    tasks.Add(ScreepsAPI.GetScreepsHistory(i, url, proxyUrl));
}
await Task.WhenAll(tasks);
stopwatch.Stop();
TimeSpan elapsedTime = stopwatch.Elapsed;
Console.WriteLine($"Elapsed Time: {elapsedTime}");

var results = tasks.Select(t => t.Result.IsSuccessStatusCode).ToList();
Console.WriteLine($"Success: {results.Count(r => r)}");