var express = require("express"),
    https = require("https"),
    util = require("util"),
    app = express();
var request = require('request');
var f1 = require('./apiData.js');
var port = process.env.PORT || 3006;
var basicAuth = require('express-basic-auth')

app.use(basicAuth({
        users: { 'monitor': 'password' },
    unauthorizedResponse: getUnauthorizedResponse
    }))
 
    function getUnauthorizedResponse(req) {
        return req.auth ?
            ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') :
            'No credentials provided'
    }

app.get("/api/autherrors", function(request, response) {

    


    var uriSegment = request.query.uriSegment;
    var startTime = request.query.startTime;
    var endTime = request.query.endTime;
    var noOfRequests = request.query.noOfCalls;
    var mock = request.query.mock 
    // mock section
    if(mock )
    {
    console.log(mock);
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
                "appName": "Bloom & Wild production: 0330452000",
                "orgName": "bloom--wild",
                "apiName": "shipping-api-v2-live-soap",
                "noOfCalls": 48
            },
            {
                "appName": "CCSDC2",
                "orgName": "complete-care-network-ltd",
                "apiName": "shipping-api-v2-live-soap",
                "noOfCalls": 7
            },
            {
                "appName": "Dr Fox - 0364150000",
                "orgName": "index-medical-ltd",
                "apiName": "shipping-api-v2-live-soap",
                "noOfCalls": 4
            },
            {
                "appName": "FM Royal Mail Plugin 069407002",
                "orgName": "ashley-swatton",
                "apiName": "shipping-api-v2-live-soap",
                "noOfCalls": 2
            }
        ]);
        response.end(json);
    }
}
else{

    console.log('request goes to ibm: '  + request.query)
    f1.getDataFromIBM(request, (err,body) => {
        //console.log(err);
        if(err){
            console.log(err);
            response.status(500).send({ error: err});
            
        }
        else{
            console.log('resultDataBeforeSummary: ' + body);
            f1.getSummary(request, body, (err,body) => {

                if(err){
                    console.log(err);
                    response.status(500).send({ error: err});
                }
                if(body){
                    response.status(200).send({ body});
                }else{
                    response.status(204).send();
                }
                        
                });
        }    
        response.end();
    });
    
        }
});

app.listen(port);
console.log("Listening on port ", port);
