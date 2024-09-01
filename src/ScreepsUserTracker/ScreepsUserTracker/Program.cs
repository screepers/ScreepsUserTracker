using API;
using Shared.Models;
using System.Diagnostics;

var proxies = Proxies.GetProxies();

Stopwatch stopwatch = new Stopwatch();

stopwatch.Start();

List<Task<HttpResponseResult>> tasks = new List<Task<HttpResponseResult>>();
for (int i = 0; i < proxies.Count; i++)
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