/*
	The low-powered messaging protocol MQTT was used in our project to connect to the signal device. 
*/
var mqtt = require('mqtt');
var url = require('url');
var Promise = require("bluebird");

const URL = process.env.CLOUDMQTT_URL || 'mqtt://qtlrbmjf:vpkC9JthkbtZ@m13.cloudmqtt.com:14653';

var mqtt_url = url.parse(URL);
var auth = (mqtt_url.auth || ':').split(':');
var url = "mqtt://" + mqtt_url.host;
var options = {
  port: mqtt_url.port,
  clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
  username: auth[0],
  password: auth[1],
};

var log = console.log;
exports.log = function(l) {
	log = l;
}

var client;// = mqtt.connect(url, options);
exports.connect = function () {
	return new Promise(function (res, rej) {
		client = mqtt.connect(url, options);
		client.on('connect', function () {
			log("Connected to", url);
			res(client);
		});
		client.on('error', (e) => log('Error!!', e));

	});
};
