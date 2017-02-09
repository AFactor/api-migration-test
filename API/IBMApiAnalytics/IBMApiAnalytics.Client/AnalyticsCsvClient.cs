using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using IBMApiAnalytics.Models;
using ServiceStack.Text;

namespace IBMApiAnalytics.Client
{
    public class AnalyticsCsvClient
    {
        private void WriteToFile(IEnumerable<CallSummaryForOrg> data, string fileNamePart)
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

        private void WriteToFile(IEnumerable<CallSummary> data, string fileNamePart)
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

        private void WriteToFile(IEnumerable<Call> data, string fileNamePart, string elastic)
        {
            if (ConfigurationManager.AppSettings["createCSV"].ToLower() == "true")
            {
                using (var file = new System.IO.StreamWriter($"apiDetail_{fileNamePart}.csv", true))
                {
                    var csv = CsvSerializer.SerializeToCsv(data.Select(i => new { i.Id, i.apiName, i.apiVersion, i.appName, i.datetime, i.devOrgName, i.envName, i.planName, i.planVersion, i.statusCode, i.timeToServeRequest, i.latency, i.requestBody, i.queryString }));
                    file.Write(csv);
                }
            }
        }
    }
}
