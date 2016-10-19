using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
namespace IBMApiAnaltycs
{
    using ServiceStack.Text;
    using System.Net;

    internal class Program
    {
        private static void Main(string[] args)
        {
            var sumaryValues = true;
            var detailValues = true;
            int takeFirstN = 1500000;
            var startTime = DateTime.Now;
            var limit = 20000;
            var summary = new List<CallSummary>();
            var before = DateTime.UtcNow.Date.AddMinutes(-1410).ToString("s");
            var after = DateTime.UtcNow.Date.AddDays(-1).ToString("s");
            var fileNamePart = string.Format(
                "{0}_{1}",
                DateTime.UtcNow.Date.AddDays(-1).ToString("ddMMyyHHmm"),
                DateTime.UtcNow.Date.AddMinutes(-1410).ToString("ddMMyyHHmm"));
            Console.WriteLine("Preparing for first call from {0}  to {1}. Each call will process {2} rows", after, before, limit);
            var nextRef =
                string.Format(
                    "https://eu.apim.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/events?before={1}&after={0}&limit={2}",
                    after, before, limit);
            var callsProcesssed = 0;
            bool first = true;
            while (!string.IsNullOrEmpty(nextRef) && callsProcesssed < takeFirstN)
            {
                try
                {

                
                    var data = FromUri(nextRef);
                    var log = JsonConvert.DeserializeObject<Log>(data);
                    if (log.nextHref != null)
                    {
                        nextRef = log.nextHref;
                    }
                    if (first)
                    {
                        Console.WriteLine(" Total calls from {0}  to {1} = {2}", after, before, log.totalCalls.ToString("N0"));
                        takeFirstN = new[] { log.totalCalls, takeFirstN }.Min();
                        first = false;
                    }
                    else
                    {
                        Console.WriteLine("{0} rows processed. Time passed {1}", callsProcesssed.ToString("N0"), DateTime.Now - startTime);
                    }
                    callsProcesssed += limit;

                    if (sumaryValues)
                    {
                        summary.AddRange(
                            log.calls.GroupBy(c => new { c.apiName, c.devOrgName })
                                .Select(
                                    cl =>
                                    new CallSummary
                                        {
                                            Api = cl.First().apiName,
                                            Org = cl.First().devOrgName,
                                            Count = cl.Count(),
                                            Ok200 = cl.Count(x => x.statusCode.StartsWith("200")),
                                            Error5X = cl.Count(x => x.statusCode.Contains("5"))//,
                                            //Others = cl.Count(x => (!x.statusCode.StartsWith("200") && !x.statusCode.StartsWith("500")))
                                        })
                                .ToList());
                        Console.WriteLine("{0} grouping rows added. Time passed {1}",  summary.Count, DateTime.Now - startTime);
                    
                    }

                    if(detailValues)
                    {
                        var selectCalls = log.calls.Where(c => c.planName == "Live Tracking Plan");
                        WriteToFile(selectCalls, fileNamePart);
                        Console.WriteLine("{0} rows added. Time passed {1}", selectCalls.Count(), DateTime.Now - startTime);
                    }
                }
                catch (Exception e)
                {
                    nextRef = null;
                    Console.WriteLine("something went wrong. Continuing to summary" + e.Message);
                }
                
            }

            if (sumaryValues)
            {
                var finalList =
                    summary.GroupBy(c => new { c.Api, c.Org })
                        .Select(
                            cl =>
                            new CallSummary
                                {
                                    Api = cl.First().Api,
                                    Org = cl.First().Org,
                                    Count = cl.Sum(clt => clt.Count),
                                    Ok200 = cl.Sum(clt => clt.Ok200),
                                    Error5X = cl.Sum(clt => clt.Error5X)
                                });

                foreach (var item in finalList)
                {
                    item.SuccessPercent = item.Ok200 / item.Count * 100;
                }
                WriteToFile(finalList, fileNamePart);
                Console.WriteLine("Final group count" + finalList.Count());
            }
            Console.WriteLine("press any key to exit.");
            Console.ReadLine();
        }

        private static string FromUri(string uri)
        {
            string json;
            var client = new WebClient();
            
            client.Headers.Add("Accept-Language", " en-US");
            client.Headers.Add("Content-Type", "application/json");
            client.Headers.Add("User-Agent", "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)");
            client.Headers.Add(
                "authorization",
                "Basic YXBpbWFuYWdlci9hdmlrLnNlbmd1cHRhQHJveWFsbWFpbC5jb206V2VsY29tZTE=");




            json = client.DownloadString(uri);
            return json;
        }

        private static void WriteToFile(IEnumerable<CallSummary> data, string fileNamePart)
        {
            using (var file = new System.IO.StreamWriter( string.Format("apiSummary_{0}.csv", fileNamePart)))
            {
                var csv = CsvSerializer.SerializeToCsv(data);
                file.Write(csv);
            }
        }

        private static void WriteToFile(IEnumerable<Call> data, string fileNamePart)
        {
            using (var file = new System.IO.StreamWriter(string.Format("apiDetail_{0}.csv",  fileNamePart), true))
            {
                var csv = CsvSerializer.SerializeToCsv(data.Select(i => new { i.apiName, i.apiVersion, i.appName, i.datetime, i.devOrgName, i.envName, i.planName, i.planVersion, i.statusCode, i.timeToServeRequest }));
                file.Write(csv);
            }
        }
    }

    public class Call
    {
        public string datetime { get; set; }
        public string apiName { get; set; }
        public int apiVersion { get; set; }
        public string appName { get; set; }
        public string envName { get; set; }
        public string planName { get; set; }
        public int planVersion { get; set; }
        public string devOrgName { get; set; }
        public string resourceName { get; set; }
        public int timeToServeRequest { get; set; }
        public int bytesSent { get; set; }
        public string requestProtocol { get; set; }
        public string requestMethod { get; set; }
        public string uriPath { get; set; }
        public string queryString { get; set; }
        public string statusCode { get; set; }
        public string requestHeaders { get; set; }
        public string userAgent { get; set; }
        public string requestBody { get; set; }
        public string responseHeaders { get; set; }
        public string responseBody { get; set; }
        public string latency { get; set; }
        public int? bytesReceived { get; set; }
    }


    public class CallSummary
    {
        //public string Date { get; set; }
        
        public string Org { get; set; }
        public string Api { get; set; }
       // public string Status { get; set; }
        public int Count { get; set; }
        public int Ok200 { get; set; }
        public int Error5X { get; set; }
        //public int Others { get; set; }
        public decimal SuccessPercent { get; set; }
    }

    public class Log
    {
        public int totalCalls { get; set; }
        public string next { get; set; }
        public string nextHref { get; set; }
        public List<Call> calls { get; set; }
    }
}


