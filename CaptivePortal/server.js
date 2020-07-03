// import environment variables
require('dotenv').config();

// Node JS development web server
var express = require("express");
var app = express();

// import node modules
var request = require("request");

// Express Midleware  - BodyParser
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// serve static public site files
app.use(express.static('public'));

/* serves main page */
app.get("/", function(req, res) {
  res.sendFile('public/index.html');
});

/* backend processing of MAC checking & bypass */
app.get("/process", async function(req, res){
    var access_token = await getToken();
    var is_professor = await isProfessor(access_token, req.query.email);
    console.log('Is professor? ', is_professor);
    if(is_professor[0]){
      macBypass(req.query.mac);
      storeMac(access_token, is_professor[1], req.query.mac);
    }
});

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

// Check the input email to see if this is a login from Professor
async function isProfessor(token, email){
  var options = {
    'method': 'GET',
    'url': 'https://graph.microsoft.com/v1.0/users/' + email,
    'headers': { 'Authorization': token }
  };

  return new Promise(function(resolve, reject){
    request(options, function(error, response, body){
      if(error){
        reject(error);
      }else{
        if(JSON.parse(body)['error']){
          resolve([false]);
        }else{
          var profId = JSON.parse(body)['id'];
          resolve([true, profId]);
        }
      }
    });
  });
}

// Apply Splash bypass policy to professor's device in Meraki
function macBypass(mac){
  var options = {
    'method': 'POST',
    'url': 'https://n240.meraki.com/api/v0/networks/' + process.env.MERAKI_NET_ID + '/clients/provision',
    'headers': { 'X-Cisco-Meraki-API-Key': process.env.MERAKI_API_KEY },
    formData: {
      'mac': mac,
      'devicePolicy': 'Group policy',
      'groupPolicyId': process.env.MERAKI_POLICY_ID
    }
  };

  request(options, function(error, response){
    if(error) throw new Error(error);
    console.log(JSON.parse(JSON.stringify(response)));
  });
}

// Store professor's device MAC address in Azure AD
function storeMac(token, id, mac){
  var options = {
    'method': 'POST',
    'url': 'https://graph.microsoft.com/v1.0/users/' + id + '/extensions',
    'headers': {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    body: "{\n  \"@odata.type\" : \"microsoft.graph.openTypeExtension\",\n  \"extensionName\" : \"MACAddress\",\n  \"mac\" : \"" + mac + "\"\n}"
  };

  request(options, function(error, response){
    if(error) throw new Error(error);
    console.log(JSON.parse(JSON.stringify(response)));
  });
}

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
