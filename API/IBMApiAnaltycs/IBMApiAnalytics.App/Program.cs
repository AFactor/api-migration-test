using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using Nest;
using System.Threading.Tasks;
using System.Text;
using ServiceStack.Text;
using System.Configuration;
using System.Net;
using IBMApiAnalytics.Client;
using IBMApiAnalytics.Models;

namespace IBMApiAnalytics.App
{

    internal class Program
    {
        private const string transactionIdPrefix = "X-Global-Transaction-ID : ";
        private const int transactionIdHeaderPrefixLength = 26;

        private static void Main(string[] args)
        {
            var arguments = CommandLineParser.Parse(args);

            //var startDateTime = arguments.StartDateTime;
            //var endDateTime = arguments.EndDateTime;

            var groupSummary = bool.Parse(ConfigurationManager.AppSettings["summary"]);
            var detail = bool.Parse(ConfigurationManager.AppSettings["detail"]);
            var env = ConfigurationManager.AppSettings["env"];
            var org = ConfigurationManager.AppSettings["org"];
            var uri = ConfigurationManager.AppSettings["uri"];
            var proxy = ConfigurationManager.AppSettings["proxy"];
            var planFilter = ConfigurationManager.AppSettings["APIFilterDetail"];
            var useProxy = bool.Parse(ConfigurationManager.AppSettings["useProxy"]);
            var elastic = ConfigurationManager.AppSettings["elastic"];
            var target = ConfigurationManager.AppSettings["target"];
            DateTime recordsProcessedUpto = DateTime.MinValue;
            TimeRangeType timeRangeTypes = (TimeRangeType)Enum.Parse(typeof(TimeRangeType), ConfigurationManager.AppSettings["timerange"]);

            int limit;
            if (!int.TryParse(ConfigurationManager.AppSettings["maxRowsToProcessInLoop"], out limit))
            {
                limit = 10000;
            }

            
            int maxThreads;
            if (!int.TryParse(ConfigurationManager.AppSettings["maxParallelThreads"], out maxThreads))
            {
                maxThreads = 3;
            }
            var errorLines = new StringBuilder();

            var processingStartTime = DateTime.Now;

            if (target.Equals("AMAZON"))
            {
                var amazonClient = new AmazonElasticClient();
                amazonClient.Index(elastic);
            }

            else
            {
                if (timeRangeTypes == TimeRangeType.Specific)
                {
                    var daysToProcess = new List<DateTime>();

                    for (var day = 0; day < arguments.NoOfPreviousDaysToProcess; day++)
                    {
                        daysToProcess.Add(arguments.StartDateTime.AddDays(-day));
                    }

                    Parallel.ForEach(daysToProcess, new ParallelOptions { MaxDegreeOfParallelism = maxThreads }, (currentDay) =>
                    {
                        var count = bool.Parse(ConfigurationManager.AppSettings["count"]);

                        var thisStartDateTime = currentDay;
                        recordsProcessedUpto = thisStartDateTime;
                        var thisEndDateTime = currentDay.Date.AddHours(arguments.EndDateTime.Hour)
                                                    .AddMinutes(arguments.EndDateTime.Minute)
                                                    .AddSeconds(arguments.EndDateTime.Second);

                        var summary = new List<CallSummaryForOrg>();

                        var fileNamePart =  $"{thisStartDateTime:ddMMyyHHmm}_{thisEndDateTime:ddMMyyHHmm}";

                        Console.WriteLine("Preparing for first call from {0}  to {1}. Each call will process {2} rows", thisStartDateTime, thisEndDateTime, limit);

                        var nextRef = string.Format(uri, org, env, thisEndDateTime.ToString("yyyy-MM-ddTHH:mm:ss"), thisStartDateTime.ToString("yyyy-MM-ddTHH:mm:ss"), limit); //2016-11-17T13:00:00

                        var callsProcesssed = 0;
                        var totalCalls = 0;
                        var first = true;
                        var retries = 0;
                        while (!string.IsNullOrEmpty(nextRef) && callsProcesssed <= totalCalls & (groupSummary || detail || count))
                        {
                            try
                            {
//#if debug
                                Console.WriteLine("NextRef: " + nextRef);
//#endif
                                var data = FromUri(nextRef, arguments.Credentials, proxy, useProxy);
                                var log = JsonConvert.DeserializeObject<Log>(data);
                                if (log.nextHref != null)
                                {
                                    nextRef = log.nextHref;
                                }
                                if (first)
                                {
                                    Console.WriteLine(" Total calls from {0}  to {1} = {2}", thisStartDateTime, thisEndDateTime, log.totalCalls.ToString("N0"));
                                    totalCalls = log.totalCalls;
                                    LoadDataIntoElastic(totalCalls, thisStartDateTime.Date, elastic);
                                    first = false;
                                    count = false;
                                }
                                else
                                {
                                    Console.WriteLine("{0} out of {2} rows processed for {3}. Time passed {1}", callsProcesssed.ToString("N0"), DateTime.Now - processingStartTime, totalCalls, thisStartDateTime.Date);
                                }
                                callsProcesssed += limit;

                                if (groupSummary)
                                {
                                    summary.AddRange(
                                        log.calls.GroupBy(c => new { c.apiName, c.devOrgName })
                                            .Select(
                                                cl =>
                                                new CallSummaryForOrg
                                                {
                                                    Api = cl.First().apiName,
                                                    Org = cl.First().devOrgName,
                                                    Count = cl.Count(),
                                                    Ok200 = cl.Count(x => x.statusCode.StartsWith("2")),
                                                    Error3x = cl.Count(x => x.statusCode.StartsWith("3")),
                                                    Error4X = cl.Count(x => x.statusCode.StartsWith("4")),
                                                    Error5X = cl.Count(x => x.statusCode.StartsWith("5"))
                                                })
                                            .ToList());
                                    Console.WriteLine("{0} grouping rows added. Time passed {1}", summary.Count, DateTime.Now - processingStartTime);
                                    WriteToFile(summary, fileNamePart);
                                }

                                if (detail)
                                {
                                    var selectCalls = log.calls.Where(c => c.apiName.Contains(planFilter) || string.IsNullOrWhiteSpace(planFilter)).ToList();
                                    selectCalls.ForEach(s => s.Id = GetCallId(s));
                                    WriteToFile(selectCalls, fileNamePart, elastic);
                                    Console.WriteLine("{0} rows added. Time passed {1}", selectCalls.Count(), DateTime.Now - processingStartTime);
                                    recordsProcessedUpto = DateTime.Parse(selectCalls.Max(s => s.datetime));
                                    Console.WriteLine("Last processed time : {0}", recordsProcessedUpto);
                                }
                            }
                            catch (Exception e)
                            {
                                retries++;
                                nextRef = retries <= 3 ? nextRef : null;

                                var errorText = $"Error when writing data for {currentDay}. Error - {e.ToString()}";
                                errorLines.AppendLine(errorText);
                                Console.WriteLine("Last processed time : {0}", recordsProcessedUpto);
                                Console.WriteLine("something went wrong. Continuing to summary. " + e.Message);
                            }

                        }

                        if (groupSummary)
                        {
                            var finalOrgList =
                                summary.GroupBy(c => new { c.Api, c.Org })
                                    .Select(
                                        cl =>
                                        new CallSummaryForOrg
                                        {
                                            Id = GetCallSumaryForOrgId(thisStartDateTime.Date.ToString("yyyyMMdd"), cl.First()),
                                            datetime = thisStartDateTime.Date,
                                            Api = cl.First().Api,
                                            Org = cl.First().Org,
                                            Count = cl.Sum(clt => clt.Count),
                                            Ok200 = cl.Sum(clt => clt.Ok200),
                                            Error4X = cl.Sum(clt => clt.Error4X),
                                            Error5X = cl.Sum(clt => clt.Error5X)
                                        }).ToList();

                            finalOrgList.ForEach(f => f.SuccessPercent = Math.Round((((decimal)f.Ok200 / (decimal)f.Count) * 100), 2));
                            if (finalOrgList.Count > 0)
                            {
                                LoadDataIntoElastic(finalOrgList, elastic);
                                WriteToFile(finalOrgList, fileNamePart);
                            }

                            var finalList =
                            summary.GroupBy(c => new { c.Api })
                                .Select(
                                    cl =>
                                    new CallSummary
                                    {
                                        Id = GetCallSumaryId(thisStartDateTime.Date.ToString("yyyyMMdd"), cl.First().Api),
                                        datetime = thisStartDateTime.Date,
                                        Api = cl.First().Api,
                                        Count = cl.Sum(clt => clt.Count),
                                        Ok200 = cl.Sum(clt => clt.Ok200),
                                        Error4X = cl.Sum(clt => clt.Error4X),
                                        Error5X = cl.Sum(clt => clt.Error5X)
                                    }).ToList();

                            finalList.ForEach(f => f.SuccessPercent = Math.Round((((decimal)f.Ok200 / (decimal)f.Count) * 100), 2));
                            if (finalList.Count > 0)
                            {
                                LoadDataIntoElastic(finalList, elastic);
                                WriteToFile(finalList, fileNamePart);
                            }
                            Console.WriteLine("Final group count" + finalList.Count());
                        }
                    });

                }
                System.IO.File.WriteAllText(string.Format("Errors{0}", DateTime.Now.ToString("yyyyMMdd.hhmmss")), errorLines.ToString());
                Console.WriteLine("press any key to exit.");
                Console.ReadLine();
            }
        }

        private static void LoadDataIntoElastic(int totalCalls, DateTime date, string elastic)
        {
            var node = new Uri(elastic);
            var settings = new ConnectionSettings(node);
            settings.DefaultIndex("apic-volumes");
            var client = new Nest.ElasticClient(settings);
            var callVolume = new CallVolumePerDay { Id = $"Vol{date.ToString("yyyyMMdd")}", datetime = date, day = date.DayOfWeek.ToString(), count = totalCalls };
            var response = client.Index(callVolume);
            if (response.IsValid)
            {
                Console.WriteLine("Index with id: " + response.Id);
            }
            else
            {
                Console.WriteLine(response.ServerError.Error.Reason);
            }
            //client.CloseIndex("apic-volumes");
        }

        private static string FromUri(string uri, string credential, string proxy, bool useProxy)
        {
            string json;
            using (var client = new WebClient())
            {
                var auth = "Basic " + Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(credential));
                client.Headers.Add("Accept-Language", " en-US");
                client.Headers.Add("Content-Type", "application/json");
                client.Headers.Add("User-Agent", "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)");
                client.Headers.Add("authorization", auth);

                if (!string.IsNullOrEmpty(proxy) && useProxy)
                {
                    client.Proxy = new WebProxy(proxy);
                    ////client.Proxy =
                    client.UseDefaultCredentials = true;
                }


                json = client.DownloadString(uri);
            }
            return json;
        }

        private static void WriteToFile(IEnumerable<CallSummaryForOrg> data, string fileNamePart)
        {
            if (ConfigurationManager.AppSettings["createCSV"].ToLower() == "true")
            {

                using (var file = new System.IO.StreamWriter($"apiSummaryForOrg_{fileNamePart}.csv"))
                {
                    var csv = CsvSerializer.SerializeToCsv(data);
                    file.Write(csv);
                }
            }

        }

        private static void WriteToFile(IEnumerable<CallSummary> data, string fileNamePart)
        {
            if (ConfigurationManager.AppSettings["createCSV"].ToLower() == "true")
            {

                using (var file = new System.IO.StreamWriter($"apiSummary_{fileNamePart}.csv"))
                {
                    var csv = CsvSerializer.SerializeToCsv(data);
                    file.Write(csv);
                }
            }

        }

        private static void WriteToFile(IEnumerable<Call> data, string fileNamePart, string elastic)
        {
            if (ConfigurationManager.AppSettings["createCSV"].ToLower() == "true")
            {
                using (var file = new System.IO.StreamWriter($"apiDetail_{fileNamePart}.csv", true))
                {
                    var csv = CsvSerializer.SerializeToCsv(data.Select(i => new { i.Id, i.apiName, i.apiVersion, i.appName, i.datetime, i.devOrgName, i.envName, i.planName, i.planVersion, i.statusCode, i.timeToServeRequest, i.latency, i.requestBody, i.queryString }));
                    file.Write(csv);
                }
            }
            if (!string.IsNullOrWhiteSpace(elastic))
            {
                LoadDataIntoElastic(data, elastic);
            }
        }

        private static void LoadDataIntoElastic(IEnumerable<CallSummaryForOrg> data, string server)
        {
            var node = new Uri(server);
            var settings = new ConnectionSettings(node);
            settings.DefaultIndex("apic-orglit");
            var client = new Nest.ElasticClient(settings);

            var response = client.IndexMany(data);
        }

        private static string GetCallSumaryForOrgId(string dateTime, CallSummaryForOrg callSummary)
        {
            return $"{dateTime}|{callSummary.Api}|{callSummary.Org}";
        }

        private static string GetCallSumaryId(string dateTime, string api)
        {
            return $"{dateTime}|{api}";
        }

        private static void LoadDataIntoElastic(IEnumerable<CallSummary> data, string server)
        {
            var node = new Uri(server);
            var settings = new ConnectionSettings(node);
            settings.DefaultIndex("apic-lit");
            var client = new Nest.ElasticClient(settings);

            var response = client.IndexMany(data);
        }


        private static void LoadDataIntoElastic(IEnumerable<Call> data, string server)
        {
            var node = new Uri(server);
            var settings = new ConnectionSettings(node);
            settings.DefaultIndex("apic-detail");
            var client = new Nest.ElasticClient(settings);


            var dataLit = (data.Select(d => new CallLit
            {Id = d.Id, apiName = d.apiName, datetime = d.datetime, devOrgName = d.devOrgName, productName = d.productName, statusCode = d.statusCode, timeToServeRequest = d.timeToServeRequest, payload = d.requestBody }));

            var response = client.IndexMany<CallLit>(dataLit);
            Console.WriteLine(response.Items.Count() + " added into the elastic index apic-detail");
        }

        private static string GetCallId(Call call)
        {

            var headers = call.requestHeaders.Split(',');
            var transactionIdHeader = headers.FirstOrDefault(h => h.StartsWith(transactionIdPrefix));
            var transactionId = "";
            if (transactionIdHeader != null)
            {
                transactionId = transactionIdHeader.Substring(transactionIdPrefix.Length - 1);
            }
            return $"{transactionId}|{call.datetime}|{call.apiName}|{call.uriPath}|{call.timeToServeRequest}";
        }

        //private static DateTime GetLastIndexedRecord(DateTime startDate, string server)
        //{
        //    var node = new Uri(server);
        //    var settings = new ConnectionSettings(node);
        //    settings.DefaultIndex("apic-detail");
        //    var client = new ElasticClient(settings);

        //    client.Get<CallLit>(server,)
        //    return startDate;
        //}
    }
}
