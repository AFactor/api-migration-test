var express = require("express"),
    https = require("https"),
    util = require("util"),
    app = express();
var request = require('request');

var port = process.env.PORT || 3006;

app.get("/api/autherrors", function(request, response) {

    var uriSegment = request.query.uriSegment;
    var startTime = request.query.startTime;
    var endTime = request.query.endTime;
    var noOfRequests = request.query.noOfCalls;

    var date = new Date();
    if (date.getSeconds() % 2 != 0 && date.getSeconds() % 3 != 0 && date.getSeconds() % 7 != 0) {
    //if (uriSegment.length !== 0 && uriSegment.indexOf("signature") < 0) {
        response.status(204);
        response.end();
    } else {
        response.status(200);
    
        response.setHeader('Content-Type', 'application/json');
        var apiName = util.format('%s%s%s', 'tracking-v2-rest/', 'signature/', 'alert');
        var json = JSON.stringify([
            {
                "noOfCalls": "45",
                "apiName": apiName,
                "orgName": "Pitney-Bowes"
            },
            {
                "noOfCalls": "21",
                "apiName": apiName,
                "orgName": "Skypax Ltd"
            },
            {
                "noOfCalls": "35",
                "apiName": "tracking-v2-rest/signature",
                "orgName": "CCS"
            },
            {
                "noOfCalls": "28",
                "apiName": "tracking-v2-rest/signature",
                "orgName": "ReplySquad"
            }
        ]);
        response.end(json);
    }
});

app.get("/api/autherrors1", function(req, response) {

    var uriSegment = req.query.uriSegment;
    var startTime = req.query.startTime;
    var endTime = req.query.endTime;
    var noOfRequests = req.query.noOfCalls;    

    var config = require('./config.json');

    var userName = config.userName, 
        password = config.password,
        baseUrl = config.baseUrl,
        pathFormat = config.path,
        limit = config.limit,
        env = config.environment,
        org = config.org
    
    var encodedCredentials = new Buffer(util.format('%s:%s', userName, password)).toString('base64');

    var path = util.format(pathFormat, org, env, endTime, startTime, noOfRequests);
    var url = baseUrl + path; //;

    console.log("url ", url);
    console.log("path ", path);
    console.log("encodedCredentials ", encodedCredentials);

    var getHeaders = {
        'Content-Type' : 'application/json',
        'authorization' : util.format('Basic %s', encodedCredentials)//'Basic YXBpbWFuYWdlci9hdmlrLnNlbmd1cHRhQHJveWFsbWFpbC5jb206VzFlbGNvbWUx'
    };

    //var url = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/events?before=2017-01-20T14:59:59&after=2017-01-20T14:00:00&limit=10";


    request.get({
        url: url,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {
        if (err) {
            console.log(err);
            response.send(err);
        } else {
            console.log(body);
            response.send(body);
        }
    });
});

app.listen(port);
console.log("Listening on port ", port);
