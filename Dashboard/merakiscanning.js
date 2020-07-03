/*
NodeJS CMX Receiver

A basic web service to accept CMX data from a Cisco Meraki network
- Accept a GET request from Meraki and respond with a validator
- Meraki will POST to server, if validated.
- POST will contain a secret, which can be verified by the server.
- JSON data will be in the req.body.data. This will be available in the cmxData function's data object.

-- This skeleton app will only place the data received on the console. It's up to the developer to use this how ever required

*/

// import environment variables
require('dotenv').config();

// import npm modules
var request = require('request');
var path = require('path');

// Express Server
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

//
app.use(bodyParser.json({ limit: '25mb' }));

// serve static public site files
app.use(express.static('public'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// set up MongoDB connections
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_CON,
{ useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
	if(err){
		console.log("Connection error: "+err);
	}else{
		console.log("Connected to MongoDB");
	}
});

// import MongoDB schema
let Professor = require('./models/professor');

// CMX Location Protocol, see https://documentation.meraki.com/MR/Monitoring_and_Reporting/CMX_Analytics#API_Configuration
//
// Meraki asks for us to know the secret
app.get('/', async function(req, res) {
	console.log('Validator = ' + process.env.MERAKI_VALIDATOR);
	res.status(200).send(process.env.MERAKI_VALIDATOR);
});
//
// Getting the flow of data every 1 to 2 minutes
app.post('/', function(req, res) {
	if (req.body.secret == process.env.MERAKI_SECRET) {
		console.log('Secret verified');
		scanningData(req.body);
		res.status(201).send();
	} else {
		console.log('Secret was invalid');
		res.status(501).send();
	}
});

// Dashboard page GUI
app.get('/dashboard', function(req, res){
	Professor.find(function(err, result){
		var data = result;
		var daily = [];
		var weekly = [];
		data.forEach((item, i) => {
			var list = data[i]['timestamps'];
			for(j=0; j<list.length; j++){
				var temp = JSON.stringify(list[j]);
				var name = data[i]['name'].replace(" ", "_");
				daily.push(name + "-" + temp.substring(9, 11) + "/" + temp.substring(6, 8) + "/" + temp.substring(1, 5) + "-" + temp.substring(12, 14));
				weekly.push(name + "-" + temp.substring(9, 11) + "/" + temp.substring(6, 8) + "/" + temp.substring(1, 5));
			}
		});
		console.log(daily, weekly, data);
		res.render('dashboard', { data: data, dailytimestamps: daily, weeklytimestamps: weekly })
	});
});

// Start server
app.listen(process.env.APP_PORT, function() {
	console.log('listening on port: ' + process.env.APP_PORT);
});

// All CMX JSON data will end up here. Send it to a database or whatever you fancy.
// data format specifications: https://documentation.meraki.com/MR/Monitoring_and_Reporting/CMX_Analytics#Version_2.0
async function scanningData(data) {
	var access_token = await getToken();
	var prof_mac_map = await professorMac(access_token);
	var apmac = await getAPName(data['data']['apMac']);

	data['data']['observations'].forEach(async scan =>{
		// console.log('each scan: ' + JSON.stringify(scan, null, 1));
		if(scan['ssid'] == process.env.SSID){
			if(prof_mac_map[scan['clientMac']]){
				prof_mac_map[scan['clientMac']].push(scan['seenTime']);
				prof_mac_map[scan['clientMac']].push(apmac);
			}
		}
	});

	console.log(prof_mac_map);

	for(const [key, value] of Object.entries(prof_mac_map)){
		if(value.length == 4){
			Professor.findOneAndUpdate(
				{ mac: key },
				{ $push: {
						timestamps: value[2],
						aps: value[3]
					}
				},
				{ useFindAndModify: false },
				function(err, result){
					if(err){
						console.log(err);
						return;
					}
					console.log(result);
					if(!result){
						new_entry = new Professor({
							name: value[0],
							email: value[1],
							mac: key,
							timestamps: value[2],
							aps: value[3]
						});
						new_entry.save(function(save_err, new_prof){
							if(save_err){
								console.log(save_err);
								return;
							}
							console.log(new_prof);
						});
					}
				}
			)
		}
	}

}

// Authenticate Azure API and get access token for subsequent API calls
async function getToken(){
  var options = {
      'method': 'POST',
      'url': "https://login.microsoftonline.com/" + process.env.AZURE_TENANT_ID + "/oauth2/v2.0/token",
      'headers': {
        'Host': 'login.microsoftonline.com',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      formData: {
        "client_id": process.env.AZURE_APP_ID,
        "scope": "https://graph.microsoft.com/.default",
        "client_secret": process.env.AZURE_SECRET,
        "grant_type": "client_credentials"
      }
  };

  return new Promise(function(resolve, reject){
      request(options, function (error, response, body){
          if(error){
              reject(error);
          }else{
              var token = JSON.parse(body)['access_token'];
              resolve(token);
          }
      });
  });
}

// Get MAC addresses of professors' devices in AD
async function professorMac(token){
  var options = {
    'method': 'GET',
    'url': 'https://graph.microsoft.com/v1.0/users?$expand=Extensions&$select=displayName,userPrincipalName&$filter=jobTitle eq \'Professor\'',
    'headers': { 'Authorization': token }
  };

  return new Promise(function(resolve, reject){
    request(options, function(error, response, body){
      if(error){
        reject(error);
      }else{
        var prof_mac_map = {};
				var data = JSON.parse(body)['value'];
				data.forEach(prof => {
					if(prof['extensions'] != null) {
						prof_mac_map[prof['extensions'][0]['mac']] = [prof['displayName'], prof['userPrincipalName']];
					}
				});
        resolve(prof_mac_map);
      }
    });
  });
}

// Get name of access point with Meraki 'Get Network Devices' API
async function getAPName(apmac){
	var options = {
    'method': 'GET',
    'url': 'https://n240.meraki.com/api/v0/networks/' + process.env.MERAKI_NET_ID + '/devices',
    'headers': { 'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY },
  };

	return new Promise(function(resolve, reject){
		request(options, function(error, response){
	    if(error) throw new Error(error);
			var devices = JSON.parse(response['body']);
			devices.forEach(device => {
				if(device['mac'] == apmac){
					resolve(device['name']);
				}
			});
		});
	});
}
