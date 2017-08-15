var request = require('request');
var config = require('./config.json');
var util = require("util");
var f = module.exports = {};
var async = require("async");
var Enumerable = require("linq")
f.getDataFromIBM = function (req, ibmCallback) { 
	// code goes here

	var uriSegment = req.query.uriSegment;
    var startTime = req.query.startTime;
    var endTime = req.query.endTime;
	var config = require('./config.json');
    var errorCode = req.query.httpCode;
	var noOfRequests = typeof req.query.noOfCalls != "undefined" ? req.query.noOfCalls : config.tolerance;   
	if(!uriSegment)
	{
		return  ibmCallback( 'no UriSegment found', null);
	}
	if(!startTime)
	{
		return ibmCallback( 'no Start Time found', null) ;
	}
	if(!endTime)
	{
		return ibmCallback( 'no End Time found', null);
	}
	if(!errorCode)
    {
        return ibmCallback( 'no http Code found',null) ;
    }
    console.log('UAT flag : ' + req.query.uat);

    var userName = config.userName, 
        password = config.password,
        baseUrl = config.baseUrl,
        pathFormat = req.query.uat? config.uatPath : config.path,
        limit = config.limit,
        env = req.query.uat? config.uatEnvironment : config.environment,
        org = config.org,
        fields = config.fields;
    
    var encodedCredentials = new Buffer(util.format('%s:%s', userName, password)).toString('base64');

    var path = req.query.uat? util.format(pathFormat, org, env, endTime, startTime, limit) :util.format(pathFormat, org, env, endTime, startTime, limit, fields);
    var url = baseUrl + path; //;

    console.log("url ", url);
    console.log("path ", path);
    console.log("encodedCredentials ", util.format('Basic %s', encodedCredentials));

    var getHeaders = {
        'Content-Type' : 'application/json',
        'authorization' : util.format('Basic %s', encodedCredentials)//'Basic YXBpbWFuYWdlci9hdmlrLnNlbmd1cHRhQHJveWFsbWFpbC5jb206VzFlbGNvbWUx'
    };

    
    var calls = {"totalCalls":0,"next":"","nextHref": url,"calls":[]};
    var count = 1;
    var total = 1;
    

    async.whilst(
    function() { return count <= total; },
    function(callback) {
        
        
        console.log('This Url: ' + calls.nextHref);
       request.get({
        url: calls.nextHref,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {
        if(err || (res.statusCode!=200))
        {
            err = 'IBM API is returning status ' +  res.statusCode + '. Please raise a support ticket with IBM';
            console.log('err: The program shall not run any more' + err );
            return ibmCallback(err, null);
        }
        console.log('count ' + count);
        console.log('body: '  + res.statusCode);
        var thisCall = JSON.parse(body);
        calls.totalCalls = thisCall.totalCalls;
        console.log('Total Call to pull: ' + calls.totalCalls);

        calls.nextHref = thisCall.nextHref;
        console.log('Next Url: ' + calls.nextHref);
        total = Math.ceil(calls.totalCalls/limit);
        console.log('Total iteration: ' + total);
        thisCall.calls.forEach( function(element, index) {
            calls.calls.push( 
                {"uri" : element.uriPath, 
                "status" : element.statusCode,
                "timestamp": element.timestamp,
                "apiName": element.apiName,
                "appName" : element.appName,
                "planName": element.planName,
                "devOrgName": element.devOrgName} );
        });
        count++;
        callback(null, count);
        
    }); 

         
    },
    function (err, n) {
        //console.log(calls);
        console.log('final count:' + count);
        return ibmCallback(null,calls);
    }
);
    //---test end

    

    //return callback(calls);
	//return
};
f. getSummary = function(req, data, ibmCallback)
{
    var config = require('./config.json');
    var uriSegment = req.query.uriSegment;
    var errorCode = req.query.httpCode;
    var threshold = req.query.noOfCalls;
    var noOfRequests = typeof req.query.noOfCalls != "undefined" ? req.query.noOfCalls : config.tolerance; 

    data.calls.sort(function(a, b) {
        aDate = new Date(a.timestamp);
        bDate = new Date(b.timestamp);

        aApp = a.appName;
        bApp = b.appName;

        aStatus = a.status;
        b.status = b.status;



        if(aApp == bApp)
            {
                

                return (aDate > bDate) ? -1 : (aDate < bDate) ? 1 : 0;
            }
            else
            {
                return (aApp < bApp) ? -1 : 1;
            }

        return a>b ? -1 : a<b ? 1 : 0;
    });
    
    var filtered =[];
    data.calls.forEach( function(element, index) {
        if(element.uri.includes(uriSegment))
        {
            filtered.push(element);
        }
    });


    //console.log("filtered: " + JSON.stringify(filtered));
    //console.log(threshold);
    var appName = "";
    var orgName ="";
    var apiName = "";
    var count = 0;
    var errorList =[]
    filtered.forEach( function(element, index) {
        if(element.appName == appName && element.status.includes(errorCode)){
                    count++;
                    //console.log('if')
        }
        else{
                //console.log(appName)
                if(appName!=""){
                    errorList.push({ "appName": appName, "orgName": orgName, "apiName" : apiName , "noOfCalls": count});
                    
                }
                appName = "";
                count = 0;
                if (element.status.includes(errorCode)){
                 appName = element.appName;
                 apiName = element.apiName;
                 orgName = element.devOrgName;
                 count =1;
                }

            }
    });
    //program comes out of foreach with one more to push in.
    if(appName!=""){
        errorList.push({ "appName": appName, "orgName": orgName, "apiName" : apiName , "noOfCalls": count});
    }
    var filteredErrorList =[];
    console.log(errorList);
    errorList.forEach( function(element, index) {
        
        if(element.noOfCalls>=threshold)
        {
            filteredErrorList.push(element);
        }
    });
    //console.log(errorList);
    if(filteredErrorList.length>0){
        return ibmCallback(null, filteredErrorList);
    }
    else
        return ibmCallback(null,null);
        
};


