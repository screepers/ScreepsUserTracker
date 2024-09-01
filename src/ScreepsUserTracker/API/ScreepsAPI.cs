using Shared.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace API
{
    public class ScreepsAPI
    {
        public static int Y {get;set;}
        public async static Task<HttpResponseResult> GetScreepsHistory(int i, string url, string? proxyUrl = null)
        {
            var responseResult = await HttpHelper.GetAsync(url, proxyUrl);

            Console.WriteLine($"{Y}-{i}: Is Success: {responseResult.IsSuccessStatusCode}");
            Y += 1;
            return responseResult;
        }
    }
}
