using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API
{
    public class Proxies
    {
        public static List<string> GetProxies()
        {
            var proxies = new List<string>();
            string[] proxiesArray = File.ReadAllLines("proxies.txt");
            foreach (string proxy in proxiesArray)
            {
                   proxies.Add($"{proxy}");
            }
            return proxies;
        }
    }
}
