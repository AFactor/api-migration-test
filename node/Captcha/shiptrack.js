var apim = require('./apim.custom.js');
var dictionary = apim.getvariable('dictionary');
var eventsResponse = apim.getvariable('eventsresponse.body');
var errorDictionary = {
	"E0007": {
		"ErrorDetailCode": "201",
		"ErrorDetailCodeDesc": "INVALID USERID/PASSWORD"
	},
	"E0000": {
		"ErrorDetailCode": "301",
		"ErrorDetailCodeDesc": "TRACKING SERVICE NOT AVAILABLE"
	},
	"E0010": {
		"ErrorDetailCode": "301",
		"ErrorDetailCodeDesc": "TRACKING SERVICE NOT AVAILABLE"
	},
	"E0004": {
		"ErrorDetailCode": "204",
		"ErrorDetailCodeDesc": "XML DOCUMENT NOT VALID"
	},
	"E0005": {
		"ErrorDetailCode": "301",
		"ErrorDetailCodeDesc": "TRACKING SERVICE NOT AVAILABLE"
	},
	"E1144": {
		"ErrorDetailCode": "102",
		"ErrorDetailCodeDesc": "NO TRACKING INFO FOUND"
	},
	"E1145": {
		"ErrorDetailCode": "102",
		"ErrorDetailCodeDesc": "NO TRACKING INFO FOUND"
	},
	"E1283": {
		"ErrorDetailCode": "102",
		"ErrorDetailCodeDesc": "NO TRACKING INFO FOUND"
	},
	"E1284": {
		"ErrorDetailCode": "102",
		"ErrorDetailCodeDesc": "NO TRACKING INFO FOUND"
	},
	"E1142": {
		"ErrorDetailCode": "101",
		"ErrorDetailCodeDesc": "INVALID TRACKING NUMBER"
	}
};

if(eventsResponse.integrationFooter) {
	buildOutputErrorMessage(eventsResponse, function (errorResponse) {
		session.output.write(errorResponse);
		apim.output('application/json');
	});
} else {
	buildOutputMessage(eventsResponse, function (response) {
		session.output.write(response);
		apim.output('application/json');
	});
}

function buildOutputErrorMessage(response, callback) {
	var errorTrackingNo = apim.getvariable('jacktest.TrackingNumber');
	lookupErrorCode(response.integrationFooter.errors.error[0].errorCode, function (errorObject) {
		if(errorObject.lookupfailed) {
			console.log("Failed to find corresponding error detail for code: " + response.integrationFooter.errors.error[0].errorCode);
			return callback({
				"Error": "Could not find error"
			});
		}
		var errorTemplate = {
			"AmazonTrackingResponse": {
				"APIVersion": "4.0",
				"TrackingErrorInfo": {
					"TrackingNumber": errorTrackingNo,
					"TrackingErrorDetail": {
						"ErrorDetailCode": errorObject.ErrorDetailCode,
						"ErrorDetailCodeDesc": errorObject.ErrorDetailCodeDesc
					}
				}
			}
		};
		console.error(errorTemplate);
		return callback(errorTemplate);
	});
}

function buildOutputMessage(response, callback) {
	var template = {
		"AmazonTrackingResponse": {
			"APIVersion": "4.0",
			"PackageTrackingInfo": {
				"TrackingNumber": "",
				"PackageDestinationLocation": {
					"City": "",
					"CountryCode": ""
				},
				"TrackingEventHistory": []
			}
		}
	};
	if(response.mailPieces.summary.oneDBarcode) {
		template.AmazonTrackingResponse.PackageTrackingInfo.TrackingNumber = response.mailPieces.summary.oneDBarcode;
	}
	// IF THERE IS AN EVENTS ARRAY, POPULATE THE EVENT DETAILS FROM THIS
	if(response.mailPieces.events) {
		response.mailPieces.events.forEach(function (element, index) {
			lookupCode(element.eventCode, function (lookupResult) {
				if(!element.CountryCode) {
					element.CountryCode = '';
				}
				if(!element.locationName) {
					element.locationName = '';
				}
				if(lookupResult.lookupfailed) {
					console.log("Failed to find corresponding event status and reason for code: " + element.eventCode);
					return;
				}
				console.log(lookupResult);
				var trackingEventDetail = {
					TrackingEventDetail: {
						"EventStatus": lookupResult["Event Status"],
						"EventReason": lookupResult["Event Reason"],
						"EventDateTime": element.eventDateTime,
						"EventLocation": {
							"City": element.locationName,
							"CountryCode": element.CountryCode
						}
					}
				};
				template.AmazonTrackingResponse.PackageTrackingInfo.TrackingEventHistory.push(trackingEventDetail);
				return callback(template);
			});
		});
		console.log(JSON.stringify(template, null, 2));
		// IF THERE IS NO EVENTS ARRAY BUT THERE IS A SUMMARY, POPULATE THE EVENT DETAIL FROM THIS
	} else if(!response.mailPieces.events && response.mailPieces.summary) {
		lookupCode(response.mailPieces.summary.lastEventCode, function (lookupResult) {
			if(!response.mailPieces.summary.lastEventCountryCode) {
				response.mailPieces.summary.lastEventCountryCode = "";
			}
			if(!response.mailPieces.summary.lastEventLocationName) {
				response.mailPieces.summary.lastEventLocationName = "";
			}
			if(lookupResult.lookupfailed) {
				console.log("Failed to find corresponding event status and reason for code: " + response.mailPieces.summary.lastEventCode);
				return;
			}
			var trackingEventDetail = {
				TrackingEventDetail: {
					"EventStatus": lookupResult["Event Status"],
					"EventReason": lookupResult["Event Reason"],
					"EventDateTime": response.mailPieces.summary.lastEventDateTime,
					"EventLocation": {
						"City": response.mailPieces.summary.lastEventLocationName,
						"CountryCode": response.mailPieces.summary.lastEventCountryCode
					}
				}
			};
			template.AmazonTrackingResponse.PackageTrackingInfo.TrackingEventHistory.push(trackingEventDetail);
			return callback(template);
		});
		// IF THERE IS NO EVENTS ARRAY AND NO SUMMARY, SOMETHING HAS PROBABLY GONE WRONG
	} else {
		console.log('no events');
		return callback({
			"Error": "Could not find event history"
		});
	}
}

function lookupCode(eventCode, callback) {
	var eventObject;
	if(dictionary.body[eventCode]) {
		eventObject = dictionary.body[eventCode];
	} else if(eventCode.match(/RM[a-zA-Z0-9]A/)) {
		eventObject = dictionary.body["RM*A"];
	} else if(eventCode.match(/RM[a-zA-Z0-9]I/)) {
		eventObject = dictionary.body["RM*I"];
	} else if(eventCode.match(/RM[a-zA-Z0-9]P/)) {
		eventObject = dictionary.body["RM*P"];
	} else {
		// Return Stock response / error
		return callback({
			"lookupfailed": true
		});
	}
	return callback(eventObject);
}

function lookupErrorCode(errorCode, callback) {
	var eventObject;
	if(errorDictionary[errorCode]) {
		eventObject = errorDictionary[errorCode];
	} else {
		return callback({
			"lookupfailed": true
		});
	}
	return callback(eventObject);
}
