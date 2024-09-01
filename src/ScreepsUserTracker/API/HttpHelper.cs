using Shared.Models;
using System;
using System.Collections.Generic;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace API
{
    public static class HttpHelper
    {
        public static string DecodeGzip(string encodedString)
        {
            byte[] compressedBytes = Convert.FromBase64String(encodedString);
            using (MemoryStream memoryStream = new MemoryStream(compressedBytes))
            {
                using (GZipStream gzipStream = new GZipStream(memoryStream, CompressionMode.Decompress))
                {
                    using (StreamReader streamReader = new StreamReader(gzipStream))
                    {
                        return streamReader.ReadToEnd();
                    }
                }
            }
        }
        public static async Task<HttpResponseResult> GetAsync(string url, string? proxyUrl = null)
        {
            var result = new HttpResponseResult();

            var client = HttpClientManager.CreateHttpClient(proxyUrl);
            try
            {
                var response = await client.GetAsync(url);
                result.StatusCode = response.StatusCode;
                result.IsSuccessStatusCode = response.IsSuccessStatusCode;

                if (response.IsSuccessStatusCode)
                {
                    if (response.Content.Headers.ContentType?.MediaType == "application/octet-stream")
                    {
                        var contentBytes = await response.Content.ReadAsByteArrayAsync();
                        var decodedContent = DecodeGzip(Convert.ToBase64String(contentBytes));
                        result.Content = decodedContent;
                    }
                    else
                    {
                        result.Content = await response.Content.ReadAsStringAsync();
                    }
                }
                else
                {
                    result.Content = $"Error: {response.ReasonPhrase}";
                }
            }
            catch (HttpRequestException e)
            {
                // Handle network-related errors
                result.StatusCode = HttpStatusCode.ServiceUnavailable;
                result.Content = $"Request error: {e.Message}";
                result.IsSuccessStatusCode = false;
            }
            catch (TaskCanceledException e)
            {
                // Handle timeout errors
                result.StatusCode = HttpStatusCode.RequestTimeout;
                result.Content = $"Request timeout: {e.Message}";
                result.IsSuccessStatusCode = false;
            }
            catch (Exception e)
            {
                // Handle all other errors
                result.StatusCode = HttpStatusCode.InternalServerError;
                result.Content = $"Unexpected error: {e.Message}";
                result.IsSuccessStatusCode = false;
            }
            
            client.Dispose();
            return result;
        }
    }
}
