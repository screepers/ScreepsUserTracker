using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace API
{
    public static class HttpClientManager
    {
        public static HttpClient CreateHttpClient(string? proxyUrl = null)
        {
            var handler = new HttpClientHandler();

            if (!string.IsNullOrEmpty(proxyUrl))
            {
                handler.Proxy = new WebProxy(proxyUrl)
                {
                    BypassProxyOnLocal = true
                };
                handler.UseProxy = true;
            }
            else
            {
                handler.UseProxy = false;
            }

            var httpClient = new HttpClient(handler)
            {
                //Timeout = TimeSpan.FromSeconds(30),
            };

            // Enable compression
            httpClient.DefaultRequestHeaders.AcceptEncoding.Add(new System.Net.Http.Headers.StringWithQualityHeaderValue("gzip"));
            httpClient.DefaultRequestHeaders.AcceptEncoding.Add(new System.Net.Http.Headers.StringWithQualityHeaderValue("deflate"));

            return httpClient;
        }
    }
}
