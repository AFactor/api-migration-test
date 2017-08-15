
var express = require("express"),
    https = require("https"),
    util = require("util"),
    app = express(),
	request = require('request'),
	fs = require('fs'),
	port = process.env.PORT || 3006,
	basicAuth = require('express-basic-auth'),
	jsonDiff = require('./index.js'),
	clc = require('cli-color');
	equal = require('deep-equal');

var resultFileName = './results/change%s' + new Date().toISOString() +'.json'
var fileLocation = "./Results/%s" + new Date().toISOString() + ".json";
var encodedCredentials = "YXBpbWFuYWdlci9hcGkucHVibGlzaEByb3lhbG1haWwuY29tOlN1cGVyRHVwZXJDbGV2ZXJVc2Vy"

//var publicServer = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/products?expand=true" 
/*var publicServer = "https://eu.apiconnect.ibmcloud.com/v1";
var dedicatedServer = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/";

var publicOrgId = "55a900b10cf272a4b3015a7a";
var dedicatedOrgId = "55a900b10cf272a4b3015a7a";

var publicLiveId = "55f16d010cf2fae1b6b74fec";
var dedicatedLiveId = "55f16d010cf2fae1b6b74fec";*/

var getHeaders = {
        'Content-Type' : 'application/json',
        'authorization' : util.format('Basic %s', encodedCredentials)//'Basic YXBpbWFuYWdlci9hdmlrLnNlbmd1cHRhQHJveWFsbWFpbC5jb206VzFlbGNvbWUx'
    };

  // https://apicmgmt.royalmail01.eu-gb.bluemix.net/apim/proxy/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/products?expand=false
  // 1. Live consumer apps
  var publicConsumerUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/consumerApps";
  var dedicatedConsumerUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/consumerApps";

  var publicConsumerApps ={};
  var dedicatedConsumerApps ={};
  
  request.get({
        url: publicConsumerUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicConsumerApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicLiveConsumers"),
			 "Public Live consumer orgs extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedConsumerUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedConsumerApps = JSON.parse(body1);
		    		//dedicatedConsumerApps = {"different": true};	
		    		//console.log(dedicatedConsumerApps.length);
		    		//dedicatedConsumerApps.splice(dedicatedConsumerApps.length-1, 1);
   					 var change = jsonDiff.diff(publicConsumerApps, dedicatedConsumerApps);
   					 writeChangeToFile(JSON.stringify(change), "Live: No change in consumer apps", "Live: change in consumer apps", util.format(resultFileName, "Prdconsumer"));
		    	}
		    });
    	}
    });
  
  
   // registry
  var publicregistryUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/registries/55ed50710cf2554a85f86d41";
  var dedicatedregistryUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/registries/55ed50710cf2554a85f86d41";

  var publicRegistry ={};
  var dedicatedRegistry ={};
  
  request.get({
        url: publicregistryUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicRegistry=  JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicLiveRegistry"),
			"Public Live Registry extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedregistryUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedRegistry = JSON.parse(body1)
		    		//dedicatedRegistry.name = "DingDong";
		    		 var change = jsonDiff.diff(publicRegistry, dedicatedRegistry);
   					 writeChangeToFile(JSON.stringify(change), "Live: No change in registry", "Live: change in registry", util.format(resultFileName,"Prdregistry"))
		    	}
		    });
    	}
    });

   // Subscription
  var publicSubUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/subscriptions";
  var dedicatedSubUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/subscriptions";

  var publicSubApps ={};
  var dedicatedSubApps ={};
  
  request.get({
        url: publicSubUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicSubApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicLiveSubscriptions"),
			 "Public Live Subscription extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedSubUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedSubApps = JSON.parse(body1);
		    		
   					 var change = jsonDiff.diff(publicSubApps, dedicatedSubApps);
   					 writeChangeToFile(JSON.stringify(change), "Live: No change in Subscription", "Live: change in Subscription", util.format(resultFileName,"Prdsubs"))
		    	}
		    });
    	}
    });


   // Products
  var publicPrdUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/products?expand=true";
  var dedicatedPrdUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/products?expand=true";

  var publicPrdApps ={};
  var dedicatedPrdApps ={};
  
  request.get({
        url: publicPrdUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicPrdApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicLiveProducts"),
			 "Public Live Products extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedPrdUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedPrdApps = JSON.parse(body1);
		    		
   					 var change = filter(publicPrdApps, dedicatedPrdApps);
   					 writeChangeToFile(JSON.stringify(change), "Live: No change in Products", "Live: change in Products", util.format(resultFileName, "PrdProducts"))
		    	}
		    });
    	}
    });

   // Members
  var publicMemUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/members";
  var dedicatedMemUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/members";

  var publicMemApps ={};
  var dedicatedMemApps ={};
  
  request.get({
        url: publicMemUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicMemApps = JSON.parse(body);
			request.get({
		        url: dedicatedMemUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedMemApps = JSON.parse(body1);
		    		dedicatedMemApps.sort(function(a, b) {
				        aApp = a.url;
				        bApp = b.url;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
		    		publicMemApps.sort(function(a, b) {
				        aApp = a.url;
				        bApp = b.url;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
 					writeDataToFile(JSON.stringify(publicMemApps), util.format(fileLocation, "publicLiveMembers"),
 					"Public Live members extracted at " + new Date().toString() + " and saved in Results subfolder");
   					 var change = filter(publicMemApps, dedicatedMemApps);
   					 writeChangeToFile(JSON.stringify(change), "Live: No change in Members", "Live: change in Members", util.format(resultFileName,"PrdMembers"))
		    	}
		    });
    	}
    });
 // ConsumerOrgs
  var publicConsumerOrgsUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/consumerOrgs";
  var dedicatedConsumerOrgsUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/consumerOrgs";

  var publicOrgApps ={};
  var dedicatedOrgApps ={};
  
  request.get({
        url: publicConsumerOrgsUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicOrgApps = JSON.parse(body);
			request.get({
		        url: dedicatedConsumerOrgsUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedOrgApps = JSON.parse(body1);
		    		dedicatedOrgApps.sort(function(a, b) {
				        aApp = a.id;
				        bApp = b.id;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
		    		publicOrgApps.sort(function(a, b) {
				        aApp = a.id;
				        bApp = b.id;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });

		    		writeDataToFile(publicOrgApps, util.format(fileLocation, "publicLiveConsumerOrgs"),
		    			"Public Live consumer Orgs  extracted at " + new Date().toString() + " and saved in Results subfolder");
   					 var change = filter(publicOrgApps, dedicatedOrgApps);
   					 writeChangeToFile(JSON.stringify(change), "Live: No change in consumer Orgs", "Live: change in consumer orgs", util.format(resultFileName,"PrdconsumerOrgs"))
		    	}
		    });
    	}
    });

   // Envs
  var publicEnvUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments";
  var dedicatedEnvUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments";

  var publicEnvApps ={};
  var dedicatedEnvApps ={};
  
  request.get({
        url: publicEnvUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicEnvApps = JSON.parse(body);
			request.get({
		        url: dedicatedEnvUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedEnvApps = JSON.parse(body1);
		    		dedicatedEnvApps.sort(function(a, b) {
				        aApp = a.name;
				        bApp = b.name;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
		    		publicEnvApps.sort(function(a, b) {
				        aApp = a.name;
				        bApp = b.name;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });

		    		 writeDataToFile(publicEnvApps, util.format(fileLocation, "publicCommonEnvs"),
		    		 	"Public Common environments extracted at " + new Date().toString() + " and saved in Results subfolder");
   					 var change = filter(publicEnvApps, dedicatedEnvApps);
   					 writeChangeToFile(JSON.stringify(change), "Common: No change in Enviornments", "Common: change in Enviornments", util.format(resultFileName,"PrdEnvironments"))
		    	}
		    });
    	}
    });

   // Draft Products
  var publicDPrdUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/products";
  var dedicatedDPrdUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/products";

  var publicDPrdApps ={};
  var dedicatedDPrdApps ={};
  
  request.get({
        url: publicDPrdUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicDPrdApps = JSON.parse(body);
			request.get({
		        url: dedicatedDPrdUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedDPrdApps = JSON.parse(body1);
		    		dedicatedDPrdApps.sort(function(a, b) {
				        aApp = a.id;
				        bApp = b.id;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
		    		publicDPrdApps.sort(function(a, b) {
				        aApp = a.id;
				        bApp = b.id;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });

		    		 writeDataToFile(publicDPrdApps, util.format(fileLocation, "publicCommonDraftProducts"),
		    		 	"Public common draft produts extracted at " + new Date().toString() + " and saved in Results subfolder");
   					 var change = filter(publicDPrdApps, dedicatedDPrdApps);
   					 writeChangeToFile(JSON.stringify(change), "Common: No change in Draft Products", "Common: change in Draft Products", util.format(resultFileName, "CommonDraft"));
		    	}
		    });
    	}
    });

//---------------------UAT ---------------------------------------------

  // consumer apps
  var publicUATConsumerUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55e581010cf2b06192d56be3/consumerApps";
  var dedicatedUATConsumerUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/consumerApps";

  var publicUATConsumerApps ={};
  var dedicatedUATConsumerApps ={};
  
  request.get({
        url: publicUATConsumerUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicUATConsumerApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicUATConsumers"),
			 "Public UAT consumer orgs extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedUATConsumerUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedUATConsumerApps = JSON.parse(body1);
		    		//dedicatedConsumerApps = {"different": true};	
		    		//console.log(dedicatedConsumerApps.length);
		    		//dedicatedConsumerApps.splice(dedicatedConsumerApps.length-1, 1);
   					 var change = jsonDiff.diff(publicUATConsumerApps, dedicatedUATConsumerApps);
   					 writeChangeToFile(JSON.stringify(change), "UAT: No change in consumer apps", "UAT: change in consumer apps", util.format(resultFileName, "UATConsumerApps"));
		    	}
		    });
    	}
    });
  
  
   // registry
  var publicUATregistryUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/registries/55e581010cf2b06192d56be3";
  var dedicatedUATregistryUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/registries/55ed50710cf2554a85f86d41";

  var publicUATRegistry ={};
  var dedicatedUATRegistry ={};
  
  request.get({
        url: publicUATregistryUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicUATRegistry=  JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicUATRegistry"),
			"Public UAT Registry extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedUATregistryUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedUATRegistry = JSON.parse(body1)
		    		//dedicatedRegistry.name = "DingDong";
		    		 var change = jsonDiff.diff(publicUATRegistry, dedicatedUATRegistry);
   					 writeChangeToFile(JSON.stringify(change), "UAT: No change in registry", "UAT: change in registry", util.format(resultFileName, "UATRegistry"));
		    	}
		    });
    	}
    });

   // Subscription
  var publicUATSubUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55e581010cf2b06192d56be3/subscriptions";
  var dedicatedUATSubUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/subscriptions";

  var publicUATSubApps ={};
  var dedicatedUATSubApps ={};
  
  request.get({
        url: publicUATSubUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicUATSubApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicUATSubscriptions"),
			 "Public UAT Subscription extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedUATSubUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedUATSubApps = JSON.parse(body1);
		    		
   					 var change = jsonDiff.diff(publicUATSubApps, dedicatedUATSubApps);
   					 writeChangeToFile(JSON.stringify(change), "UAT: No change in Subscription", "UAT: change in Subscription", util.format(resultFileName, "UATSubscription"));
		    	}
		    });
    	}
    });


   // Products
  var publicUATPrdUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55e581010cf2b06192d56be3/products?expand=true";
  var dedicatedUATPrdUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/products?expand=true";

  var publicUATPrdApps ={};
  var dedicatedUATPrdApps ={};
  
  request.get({
        url: publicUATPrdUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicUATPrdApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicUATProducts"),
			 "Public UAT Products extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedUATPrdUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedUATPrdApps = JSON.parse(body1);
		    		
   					 var change = filter(publicUATPrdApps, dedicatedUATPrdApps);
   					 writeChangeToFile(JSON.stringify(change), "UAT: No change in Products", "UAT: change in Products", util.format(resultFileName, "UATProducts"));
		    	}
		    });
    	}
    });

   // Members
  var publicUATMemUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55e581010cf2b06192d56be3/members";
  var dedicatedUATMemUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/members";

  var publicUATMemApps ={};
  var dedicatedUATMemApps ={};
  
  request.get({
        url: publicUATMemUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicUATMemApps = JSON.parse(body);
			request.get({
		        url: dedicatedUATMemUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedUATMemApps = JSON.parse(body1);
		    		dedicatedUATMemApps.sort(function(a, b) {
				        aApp = a.url;
				        bApp = b.url;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
		    		publicUATMemApps.sort(function(a, b) {
				        aApp = a.url;
				        bApp = b.url;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
 					writeDataToFile(JSON.stringify(publicUATMemApps), util.format(fileLocation, "publicUATMembers"),
 					"Public UAT members extracted at " + new Date().toString() + " and saved in Results subfolder");
   					 var change = filter(publicMemApps, dedicatedMemApps);
   					 writeChangeToFile(JSON.stringify(change), "UAT: No change in Members", "UAT: change in Members", util.format(resultFileName, "UATMembers"));
		    	}
		    });
    	}
    });
 // ConsumerOrgs
  var publicUATConsumerOrgsUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55e581010cf2b06192d56be3/consumerOrgs";
  var dedicatedUATConsumerOrgsUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55f16d010cf2fae1b6b74fec/consumerOrgs";

  var publicUATOrgApps ={};
  var dedicatedUATOrgApps ={};
  
  request.get({
        url: publicUATConsumerOrgsUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicUATOrgApps = JSON.parse(body);
			request.get({
		        url: dedicatedUATConsumerOrgsUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedUATOrgApps = JSON.parse(body1);
		    		dedicatedUATOrgApps.sort(function(a, b) {
				        aApp = a.id;
				        bApp = b.id;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
		    		publicUATOrgApps.sort(function(a, b) {
				        aApp = a.id;
				        bApp = b.id;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });

		    		writeDataToFile(publicUATOrgApps, util.format(fileLocation, "publicUATConsumerOrgs"),
		    			"Public UAT consumer Orgs  extracted at " + new Date().toString() + " and saved in Results subfolder");
   					 var change = filter(publicOrgApps, dedicatedOrgApps);
   					 writeChangeToFile(JSON.stringify(change), "UAT: No change in consumer Orgs", "UAT: change in consumer orgs", util.format(resultFileName, "UATConsumerOrgs"));
		    	}
		    });
    	}
    });

  

  //--------------------UAT END -------------------

//---------------------DEV ---------------------------------------------

  // consumer apps
  var publicDEVConsumerUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/consumerApps";
  var dedicatedDEVConsumerUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/consumerApps";

  var publicDEVConsumerApps ={};
  var dedicatedDEVConsumerApps ={};
  
  request.get({
        url: publicDEVConsumerUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicDEVConsumerApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicDEVConsumers"),
			 "Public DEV consumer orgs extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedDEVConsumerUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedDEVConsumerApps = JSON.parse(body1);
		    		//dedicatedConsumerApps = {"different": true};	
		    		//console.log(dedicatedConsumerApps.length);
		    		//dedicatedConsumerApps.splice(dedicatedConsumerApps.length-1, 1);
   					 var change = jsonDiff.diff(publicDEVConsumerApps, dedicatedDEVConsumerApps);
   					 writeChangeToFile(JSON.stringify(change), "DEV: No change in consumer apps", "DEV: change in consumer apps", resultFileName)
		    	}
		    });
    	}
    });
  
  
   // registry
  var publicDEVregistryUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/registries/55eeff8d0cf2822d3faa322e";
  var dedicatedDEVregistryUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/registries/55eeff8d0cf2822d3faa322e";

  var publicDEVRegistry ={};
  var dedicatedDEVRegistry ={};
  
  request.get({
        url: publicDEVregistryUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicDEVRegistry=  JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicDEVRegistry"),
			"Public DEV Registry extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedDEVregistryUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedDEVRegistry = JSON.parse(body1)
		    		//dedicatedRegistry.name = "DingDong";
		    		 var change = jsonDiff.diff(publicDEVRegistry, dedicatedDEVRegistry);
   					 writeChangeToFile(JSON.stringify(change), "DEV: No change in registry", "DEV: change in registry", util.format(resultFileName, "DevConsumerApps"));
		    	}
		    });
    	}
    });

   // Subscription
  var publicDEVSubUrl = "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/subscriptions";
  var dedicatedDEVSubUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/subscriptions";

  var publicDEVSubApps ={};
  var dedicatedDEVSubApps ={};
  
  request.get({
        url: publicDEVSubUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicDEVSubApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicDEVSubscriptions"),
			 "Public DEV Subscription extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedDEVSubUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedDEVSubApps = JSON.parse(body1);
		    		
   					 var change = jsonDiff.diff(publicDEVSubApps, dedicatedDEVSubApps);
   					 writeChangeToFile(JSON.stringify(change), "DEV: No change in Subscription", "DEV: change in Subscription", util.format(resultFileName, "UATSubscription"));
		    	}
		    });
    	}
    });


   // Products
  var publicDEVPrdUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/products?expand=true";
  var dedicatedDEVPrdUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/products?expand=true";

  var publicDEVPrdApps ={};
  var dedicatedDEVPrdApps ={};
  
  request.get({
        url: publicDEVPrdUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicDEVPrdApps = JSON.parse(body);
			writeDataToFile(body, util.format(fileLocation, "publicDEVProducts"),
			 "Public DEV Products extracted at " + new Date().toString() + " and saved in Results subfolder");
			request.get({
		        url: dedicatedDEVPrdUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedDEVPrdApps = JSON.parse(body1);
		    		
   					 var change = filter(publicDEVPrdApps, dedicatedDEVPrdApps);
   					 writeChangeToFile(JSON.stringify(change), "DEV: No change in Products", "DEV: change in Products", util.format(resultFileName,"DevProducts"))
		    	}
		    });
    	}
    });

   // Members
  var publicDEVMemUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/members";
  var dedicatedDEVMemUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/members";

  var publicDEVMemApps ={};
  var dedicatedDEVMemApps ={};
  
  request.get({
        url: publicDEVMemUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicDEVMemApps = JSON.parse(body);
			request.get({
		        url: dedicatedDEVMemUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedDEVMemApps = JSON.parse(body1);
		    		dedicatedDEVMemApps.sort(function(a, b) {
				        aApp = a.url;
				        bApp = b.url;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
		    		publicDEVMemApps.sort(function(a, b) {
				        aApp = a.url;
				        bApp = b.url;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
 					writeDataToFile(JSON.stringify(publicDEVMemApps), util.format(fileLocation, "publicDEVMembers"),
 					"Public DEV members extracted at " + new Date().toString() + " and saved in Results subfolder");
   					 var change = filter(publicMemApps, dedicatedMemApps);
   					 writeChangeToFile(JSON.stringify(change), "DEV: No change in Members", "DEV: change in Members", util.format(resultFileName,"DevMembers"))
		    	}
		    });
    	}
    });
 // ConsumerOrgs
  var publicDEVConsumerOrgsUrl =    "https://eu.apiconnect.ibmcloud.com/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/consumerOrgs";
  var dedicatedDEVConsumerOrgsUrl = "https://apicmgmt.royalmail01.eu-gb.bluemix.net/v1/orgs/55a900b10cf272a4b3015a7a/environments/55eeff8d0cf2822d3faa322e/consumerOrgs";

  var publicDEVOrgApps ={};
  var dedicatedDEVOrgApps ={};
  
  request.get({
        url: publicDEVConsumerOrgsUrl,
        headers: getHeaders,
        strictSSL: false
    }, (err, res, body) => {

    	if(body){
			publicDEVOrgApps = JSON.parse(body);
			request.get({
		        url: dedicatedDEVConsumerOrgsUrl,
		        headers: getHeaders,
		        strictSSL: false
		    }, (err, res, body1) => {
		    	if(body1){
		    		dedicatedDEVOrgApps = JSON.parse(body1);
		    		dedicatedDEVOrgApps.sort(function(a, b) {
				        aApp = a.id;
				        bApp = b.id;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });
		    		publicDEVOrgApps.sort(function(a, b) {
				        aApp = a.id;
				        bApp = b.id;

				        if(aApp != bApp)
				            {
				                return (aApp < bApp) ? -1 : 1;
				            }

				        return a>b ? -1 : a<b ? 1 : 0;
				    });

		    		writeDataToFile(publicDEVOrgApps, util.format(fileLocation, "publicDEVConsumerOrgs"),
		    			"Public DEV consumer Orgs  extracted at " + new Date().toString() + " and saved in Results subfolder");
   					 var change = filter(publicOrgApps, dedicatedOrgApps);
   					 writeChangeToFile(JSON.stringify(change), "DEV: No change in consumer Orgs", "DEV: change in consumer orgs", util.format(resultFileName, "DEVConsumerOrgs"))
		    	}
		    });
    	}
    });

  

  //--------------------DEV END -------------------


   var writeChangeToFile = function(change, noChangeText, changeText, path){
   		if(change){
   			//change = util.format('\n-----%s------\n %s', changeText, change);
			writeDataToFile( change, path,  path + " saved.");
			console.log(clc.red(changeText));
			 
		} else { clc.green(console.log(noChangeText));
		}

   }

   var writeDataToFile = function(data, path, logText){
   		
			fs.writeFile(path, data, function(err) {
			if(err) {
				return console.log(err);
			}
				console.log(clc.blue(logText));
			}); 
			 
   }

   function filter(obj1, obj2) {
    var result = {};
    for(var key in obj1) {
        //console.log('Key: '  + key);
        //console.log('type: ' + typeof obj1[key] + '----' + typeof obj2[key]);
         if ( obj2[key] === obj1[key] ) {
                continue;
            }
        if(obj2[key] != obj1[key]) {
          if(obj1[key] != 'undefined' || obj2[key] != 'undefined'){
          	if(obj1[key] != 'eu.apiconnect.ibmcloud.com' && obj2[key] != 'apicmgmt.royalmail01.eu-gb.bluemix.net' ){
            result[key] = {"old" :  obj1[key] || 'noValue', "new" : obj2[key]|| 'noValue'};
        }
          }
        }
        if(Array.isArray(obj1[key]) && Array.isArray(obj2[key])){
            result[key] = filter(obj1[key], obj2[key]);
            
            if(isEmpty(result[key])){
              delete result[key];
            }
        }
        if(typeof obj2[key] == 'object' && typeof obj1[key] == 'object'){ 
            result[key]  = filter(obj1[key], obj2[key]);
            //console.log('filterlength for ' + key + ' : ' + isEmpty(filterResult1));
            if(isEmpty(result[key])){
              delete result[key];
            }
              

        }
    }
    if(!isEmpty(result)){
             return result;
       }
    
}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return true;
}
