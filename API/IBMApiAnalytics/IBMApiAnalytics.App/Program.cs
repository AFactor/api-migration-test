﻿using Newtonsoft.Json;
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
using IBMApiAnalytics.Utils;
using NLog;
using System.Xml.Linq;

namespace IBMApiAnalytics.App
{

    internal class Program
    {
        private const string TransactionIdPrefix = "X-Global-Transaction-ID : ";
        private static Logger _logger = LogManager.GetCurrentClassLogger();

        private static void Main(string[] args)
        {
            var arguments = CommandLineParser.Parse(args);

            var groupSummary = bool.Parse(ConfigurationManager.AppSettings["summary"]);
            var detail = bool.Parse(ConfigurationManager.AppSettings["detail"]);
            var elastic = ConfigurationManager.AppSettings["elastic"];
            var target = ConfigurationManager.AppSettings["target"];
            var timeRangeTypes = (TimeRangeType)Enum.Parse(typeof(TimeRangeType), ConfigurationManager.AppSettings["timerange"]);
            int maxThreads = ConfigurationManager.AppSettings.SafeGet("maxParallelThreads", 3);
            var apiFilter = ConfigurationManager.AppSettings.SafeGet("detailapifilter", "");
            var orgFilterForClient = ConfigurationManager.AppSettings.SafeGet("clientorgfilter", "");
            var apiFilterForClient = ConfigurationManager.AppSettings.SafeGet("clientapifilter", "");
            var processDataForClient = bool.Parse(ConfigurationManager.AppSettings.SafeGet("clientprocessing", "false"));

            if (target.Equals("AMAZON"))
            {
                var amazonClient = new AmazonElasticClient();
                amazonClient.Index(elastic);
            }

            else
            {
                if (timeRangeTypes == TimeRangeType.XDays)
                {
                    var processingStartTime = DateTime.Now;
                    var daysToProcess = new List<DateTime>();

                    for (var day = 0; day < arguments.NoOfDaysToProcess; day++)
                    {
                        daysToProcess.Add(arguments.StartDateTime.AddDays(-day));
                        
                    }

                    daysToProcess.ForEach(d => _logger.Debug("Days to process {0}", d));

                    Parallel.ForEach(daysToProcess, new ParallelOptions { MaxDegreeOfParallelism = maxThreads }, (currentDay) =>
                    {
                        var count = bool.Parse(ConfigurationManager.AppSettings["count"]);
                        var recordsProcessedUpto = DateTime.MinValue;

                        var thisStartDateTime = currentDay.Date.AddHours(arguments.StartDateTime.Hour)
                            .AddMinutes(arguments.StartDateTime.Minute)
                            .AddSeconds(arguments.StartDateTime.Second);
                        recordsProcessedUpto = thisStartDateTime;
                        var thisEndDateTime = currentDay.Date.AddHours(arguments.EndDateTime.Hour)
                            .AddMinutes(arguments.EndDateTime.Minute)
                            .AddSeconds(arguments.EndDateTime.Second);


                        if (count)
                        {
                            var success = false;
                            var retries = 1;
                            while (!success && retries <= 3)
                            {
                                try
                                {
                                    retries++;
                                    var apiClient = new ApiMClient();
                                    var callVolume = apiClient.GetVolume(thisStartDateTime, thisEndDateTime, arguments.Credentials);
                                    _logger.Info("Call volumes for {0} - {1}", currentDay, callVolume);
                                    var client = new AnalyticsElasticClient();
                                    client.IndexVolumes(callVolume, currentDay, elastic);
                                    _logger.Info("Indexed {0} records for {1}", callVolume, currentDay);
                                    success = true;
                                }
                                catch (Exception e)
                                {
                                    _logger.Error(e, "Error retrieving API call volumes for {0:yyyyMMdd.hhmmss}", currentDay);
                                    _logger.Info("Retry attempt {0} of 3 for {1}", retries, currentDay);
                                }
                            }

                        }

                        if (groupSummary || detail)
                        {
                            _logger.Debug("Preparing for first call from {0}  to {1}. Each call will process {2} rows", thisStartDateTime, thisEndDateTime,
                                ConfigurationManager.AppSettings.SafeGet("maxRowsToProcessInLoop", 5000));

                            var totalCalls = 0;

                            var summary = new List<CallSummaryForOrg>();
                            var fileNamePart = $"{thisStartDateTime:yyyyMMddHHmm}_{thisEndDateTime:yyyyMMddHHmm}";

                            int interval;
                            if (!int.TryParse(ConfigurationManager.AppSettings["interval"], out interval))
                            {
                                interval = 15;
                            }


                            var retries = 0;
                            var currentLoopEndTime = thisEndDateTime;
                            while (thisStartDateTime < thisEndDateTime)
                            {
                                try
                                {
                                    retries++;
                                    ApiMClient apiClient = new ApiMClient();
                                    currentLoopEndTime = (thisStartDateTime.AddMinutes(interval) > thisEndDateTime ? thisEndDateTime : thisStartDateTime.AddMinutes(interval));
                                    var callEvents = apiClient.GetCalls(thisStartDateTime, currentLoopEndTime, arguments.Credentials).ToList();
                                    // For Pitney Bowes
                                    var calls = callEvents.Where(c => c.apiName.Contains(apiFilter) || string.IsNullOrWhiteSpace(apiFilter)).ToList();

                                    if (detail)
                                    {
                                        calls.ForEach(c => c.Id = GetCallId(c));
                                        ProcessDetailCalls(calls, thisStartDateTime, fileNamePart, elastic);
                                        totalCalls += calls.Count;

                                        // For Pitney Bowes / other client processing
                                        if (processDataForClient)
                                        {
                                            var filteredCalls = callEvents;
                                            if (!String.IsNullOrEmpty(orgFilterForClient))
                                            {
                                                filteredCalls = filteredCalls.Where(c => c.devOrgName == orgFilterForClient).ToList();
                                            }
                                            if (!String.IsNullOrEmpty(apiFilterForClient))
                                            {
                                                filteredCalls = filteredCalls.Where(c => c.apiName == apiFilterForClient).ToList();
                                            }
                                            ProcessClientCalls(filteredCalls, thisStartDateTime, fileNamePart, orgFilterForClient);
                                        }
                                    }

                                    if (groupSummary)
                                    {
                                        summary.AddRange(ProcessSummaryCalls(calls, currentDay));
                                    }

                                    thisStartDateTime = currentLoopEndTime;
                                    _logger.Info(" Total calls from {0} to {1} = {2}", thisStartDateTime, currentLoopEndTime, totalCalls);
                                    _logger.Info(" Time taken {0} - ", DateTime.Now - processingStartTime);

                                    recordsProcessedUpto = thisStartDateTime;


                                    if (groupSummary)
                                    {
                                        PersistSummaryData(summary, currentDay, fileNamePart, elastic);
                                    }
                                }
                                catch (Exception e)
                                {
                                    _logger.Error(e,
                                        "Error encountered at {0}. Data processed upto {1}. Exception Message - {2}.", 
                                        thisStartDateTime.ToString("yyyyMMdd.hhmmss"), recordsProcessedUpto,
                                        e.Message);
                                    if (retries < 3)
                                    {
                                        _logger.Info("Attempt {0} of 3 for {1}-{2}", retries, thisStartDateTime, currentLoopEndTime);
                                        thisStartDateTime = recordsProcessedUpto;
                                        continue;
                                    }
                                }


                                _logger.Info("Time taken to process {0} calls - {1}", totalCalls, DateTime.Now - processingStartTime);
                                _logger.Info("Last processed time : {0}", recordsProcessedUpto);

                            }
                        }
                    });

                }
                if (timeRangeTypes == TimeRangeType.Specific)
                {
                    var apiClient = new ApiMClient();
                    var totalCalls = apiClient.GetVolume(arguments.StartDateTime, arguments.EndDateTime, arguments.Credentials);
                    _logger.Info("Total calls made between {0} and {1} = {2}", arguments.StartDateTime.ToString("yyyyMMdd.hhmmss"), arguments.EndDateTime.ToString("yyyyMMdd.hhmmss"), totalCalls);
                }
                Console.WriteLine("press any key to exit.");
                Console.ReadLine();
            }
        }

        private static void ProcessDetailCalls(List<Call> calls, DateTime date, string fileNameSuffix, string elastic)
        {
           if (!calls.Any())
            {
                _logger.Debug("No detail records to index");
                return;
            }
            calls.ForEach(c => c.Id = GetCallId(c));
            if (bool.Parse(ConfigurationManager.AppSettings["createCSV"]))
            {
                var csvClient = new AnalyticsCsvClient();
                csvClient.WriteDetails(calls, fileNameSuffix);
            }
            if (!string.IsNullOrWhiteSpace(elastic))
            {
                var elasticClient = new AnalyticsElasticClient();
                elasticClient.IndexDetail(calls, date, elastic);
            }
        }

        private static void ProcessClientCalls(List<Call> calls, DateTime date, string fileNameSuffix, string org)
        {
            if (!calls.Any())
            {
                _logger.Debug("No detail records to index");
                return;
            }
            foreach (var e in calls)
            {
                e.esbErrorCode = (e.apiName.Contains("soap") && !String.IsNullOrEmpty(e.responseBody) ? GetErrorCode(e.responseBody) : "");
            }
            if (bool.Parse(ConfigurationManager.AppSettings["createCSV"]))
            {
                var csvClient = new AnalyticsCsvClient();
                csvClient.WriteClientDetails(calls, fileNameSuffix, org);
            }
        }

        private static IEnumerable<CallSummaryForOrg> ProcessSummaryCalls(List<Call> calls, DateTime date)
        {
            return calls.GroupBy(c => new {c.apiName, c.devOrgName})
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
                        }).ToList();

        }

        private static void PersistSummaryData(List<CallSummaryForOrg> orgSummary, DateTime date, string fileNameSuffix, string elastic)
        {
            if (!orgSummary.Any())
            {
                _logger.Debug("No summary records to index");
                return;
            }

            var finalOrgList =
            orgSummary.GroupBy(c => new { c.Api, c.Org })
                .Select(
                    cl =>
                    new CallSummaryForOrg
                    {
                        Id = GetCallSumaryId(date.ToString("yyyyMMdd"), cl.First().Api),
                        datetime = date.Date,
                        Api = cl.First().Api,
                        Org = cl.First().Org,
                        Count = cl.Sum(clt => clt.Count),
                        Ok200 = cl.Sum(clt => clt.Ok200),
                        Error4X = cl.Sum(clt => clt.Error4X),
                        Error5X = cl.Sum(clt => clt.Error5X)
                    }).ToList();

            finalOrgList.ForEach(f =>
            {
                f.Id = GetCallSumaryForOrgId(date.ToString("yyyyMMdd"), f);
                f.SuccessPercent = Math.Round((((decimal) f.Ok200 / (decimal) f.Count) * 100), 2);
            });

            var finalList =
            orgSummary.GroupBy(c => new { c.Api })
                .Select(
                    cl =>
                    new CallSummary
                    {
                        Id = GetCallSumaryId(date.ToString("yyyyMMdd"), cl.First().Api),
                        datetime = date.Date,
                        Api = cl.First().Api,
                        Count = cl.Sum(clt => clt.Count),
                        Ok200 = cl.Sum(clt => clt.Ok200),
                        Error4X = cl.Sum(clt => clt.Error4X),
                        Error5X = cl.Sum(clt => clt.Error5X)
                    }).ToList();

            finalList.ForEach(f => f.SuccessPercent = Math.Round((((decimal)f.Ok200 / (decimal)f.Count) * 100), 2));

            if (bool.Parse(ConfigurationManager.AppSettings["createCSV"]))
            {
                var csvClient = new AnalyticsCsvClient();
                csvClient.WriteSummary(finalList, fileNameSuffix);
                csvClient.WriteSummaryWithOrg(finalOrgList, fileNameSuffix);
            }

            if (!string.IsNullOrWhiteSpace(elastic))
            {
                var elasticClient = new AnalyticsElasticClient();
                elasticClient.IndexSummary(finalList, elastic);
                elasticClient.IndexSummaryWithOrg(finalOrgList, elastic);
            }
        }

        private static string GetCallSumaryForOrgId(string dateTime, CallSummaryForOrg callSummary)
        {
            return $"{dateTime}|{callSummary.Api}|{callSummary.Org}";
        }

        private static string GetCallSumaryId(string dateTime, string api)
        {
            return $"{dateTime}|{api}";
        }


        private static string GetCallId(Call call)
        {

            var headers = call.requestHeaders.Split(',');
            var transactionIdHeader = headers.FirstOrDefault(h => h.StartsWith(TransactionIdPrefix));
            var transactionId = "";
            if (transactionIdHeader != null)
            {
                transactionId = transactionIdHeader.Substring(TransactionIdPrefix.Length - 1);
            }
            return $"{transactionId}|{call.datetime}|{call.apiName}|{call.uriPath}|{call.timeToServeRequest}";
        }

        private static string GetErrorCode(string response)
        {
            try
            {
                var document = XDocument.Parse(response, LoadOptions.SetBaseUri);
                return document.Descendants(XName.Get("exceptionCode", "")).First().Value;
            }
            catch
            {
                return "";
            }

        }

        #region Old Code

        //private static void WriteToFile(IEnumerable<CallSummaryForOrg> data, string fileNamePart)
        //{
        //    if (ConfigurationManager.AppSettings["createCSV"].ToLower() == "true")
        //    {

        //        using (var file = new System.IO.StreamWriter($"apiSummaryForOrg_{fileNamePart}.csv"))
        //        {
        //            var csv = CsvSerializer.SerializeToCsv(data);
        //            file.Write(csv);
        //        }
        //    }

        //}

        //private static void WriteToFile(IEnumerable<CallSummary> data, string fileNamePart)
        //{
        //    if (ConfigurationManager.AppSettings["createCSV"].ToLower() == "true")
        //    {

        //        using (var file = new System.IO.StreamWriter($"apiSummary_{fileNamePart}.csv"))
        //        {
        //            var csv = CsvSerializer.SerializeToCsv(data);
        //            file.Write(csv);
        //        }
        //    }

        //}

        //private static void WriteToFile(IEnumerable<Call> data, string fileNamePart, string elastic)
        //{
        //    if (ConfigurationManager.AppSettings["createCSV"].ToLower() == "true")
        //    {
        //        using (var file = new System.IO.StreamWriter($"apiDetail_{fileNamePart}.csv", true))
        //        {
        //            var csv = CsvSerializer.SerializeToCsv(data.Select(i => new { i.Id, i.apiName, i.apiVersion, i.appName, i.datetime, i.devOrgName, i.envName, i.planName, i.planVersion, i.statusCode, i.timeToServeRequest, i.latency, i.requestBody, i.queryString }));
        //            file.Write(csv);
        //        }
        //    }
        //    if (!string.IsNullOrWhiteSpace(elastic))
        //    {
        //        LoadDataIntoElastic(data, elastic);
        //    }
        //}


        //private static void LoadDataIntoElastic(IEnumerable<CallSummaryForOrg> data, string server)
        //{
        //    var node = new Uri(server);
        //    var settings = new ConnectionSettings(node);
        //    settings.DefaultIndex("apic-orglit");
        //    var client = new Nest.ElasticClient(settings);

        //    var response = client.IndexMany(data);
        //}

        //private static void LoadDataIntoElastic(IEnumerable<CallSummary> data, string server)
        //{
        //    var node = new Uri(server);
        //    var settings = new ConnectionSettings(node);
        //    settings.DefaultIndex("apic-lit");
        //    var client = new Nest.ElasticClient(settings);

        //    var response = client.IndexMany(data);
        //}


        //private static void LoadDataIntoElastic(IEnumerable<Call> data, string server)
        //{
        //    var node = new Uri(server);
        //    var settings = new ConnectionSettings(node);
        //    settings.DefaultIndex("apic-detail");
        //    var client = new Nest.ElasticClient(settings);


        //    var dataLit = (data.Select(d => new CallLit
        //    { Id = d.Id, apiName = d.apiName, datetime = d.datetime, devOrgName = d.devOrgName, productName = d.productName, statusCode = d.statusCode, timeToServeRequest = d.timeToServeRequest, payload = d.requestBody }));

        //    var response = client.IndexMany<CallLit>(dataLit);
        //    Console.WriteLine(response.Items.Count() + " added into the elastic index apic-detail");
        //}


        //private static void LoadDataIntoElastic(int totalCalls, DateTime date, string elastic)
        //{
        //    var node = new Uri(elastic);
        //    var settings = new ConnectionSettings(node);
        //    settings.DefaultIndex("apic-volumes");
        //    var client = new Nest.ElasticClient(settings);
        //    var callVolume = new CallVolumePerDay { Id = $"Vol{date.ToString("yyyyMMdd")}", datetime = date, day = date.DayOfWeek.ToString(), count = totalCalls };
        //    var response = client.Index(callVolume);
        //    if (response.IsValid)
        //    {
        //        Console.WriteLine("Index with id: " + response.Id);
        //    }
        //    else
        //    {
        //        Console.WriteLine(response.ServerError.Error.Reason);
        //    }
        //    //client.CloseIndex("apic-volumes");
        //}

        ////private static DateTime GetLastIndexedRecord(DateTime startDate, string server)
        ////{
        ////    var node = new Uri(server);
        ////    var settings = new ConnectionSettings(node);
        ////    settings.DefaultIndex("apic-detail");
        ////    var client = new ElasticClient(settings);

        ////    client.Get<CallLit>(server,)

        ////    return startDate;
        ////}

        #endregion
    }
}
