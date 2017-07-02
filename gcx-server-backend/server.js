//server side code to perform all the necessary work
const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const url = require('url');
const PORT = process.env.PORT || 8080;
const distance = {"onsignal": 4, "close": 3, "nearby": 2, "incoming": 1};

const file = fs.createWriteStream("log");
log = function (str) {
	console.log(str);
	file.write(str + '\n');
};

var userPass = {"123": true, "456": true, "789": true, "147": true};


//deviceLocations: Fixed location of devices that are  present in traffic junctions.
var deviceLocations = {
	"t3": {lat:12.904215, lng:77.594909},
	"t4": {lat:12.906076, lng:77.594995},
	"t2": {lat:12.901757, lng:77.594974},
	"t1": {lat:12.899080, lng:77.594641},
}; 
var deviceStatus = {};
var deviceAction = {};

/*
Assuming 4 traffic signals at every junction,
deviceDirections gives the angle covered by each of the traffic signal in the junction
The key in deviceDirections is basically the name of the traffic junction, and the
value is an array of 4 Jsons, where each Json denotes the angle at which the signal coveres
in both the left and right directions:


               -
___         -
| |      -       Left angle
| |   -
| | --------------------
| |   -
| |      -       Right Angle
---         -
 |
 |            -
 |
 |
 |
_____________________________


*/ 
var deviceDirections = {
	"dal": [{left: -45, right: 45}, {left: 45, right: 135}, {left: 135, right: 225}, {left: 225, right: 315}],
	"jay": [{left: -45, right: 45}, {left: 45, right: 135}, {left: 135, right: 225}, {left: 225, right: 315}],
	"ban": [{left: -45, right: 45}, {left: 45, right: 135}, {left: 135, right: 225}, {left: 225, right: 315}],
	"jp": [{left: -45, right: 45}, {left: 45, right: 135}, {left: 135, right: 225}, {left: 225, right: 315}],
	"do": [{left: -45, right: 45}, {left: 45, right: 135}, {left: 135, right: 225}, {left: 225, right: 315}],
};



/*
Below server code is to handle secure authentication of the ambulance driver for login,
and to monitor the proximity of the ambulance to a signal.
*/
http.createServer(function (request, response) {
	var requrl = url.parse(request.url).pathname;
	log("Request for '" + requrl + "' received.");
	if (requrl.startsWith("/location")) {
		if (requrl.startsWith("/location/change")) {
			var split = requrl.split('/');
			var uid = split[3];
			if (userPass[uid]) {
				var latlngst = split[4].split(',');
				var dir = parseFloat(split[5]);
				var latlng = {lat: parseFloat(latlngst[0]), lng: parseFloat(latlngst[1])};
				oldlatlng = vehicleLocation[uid]? vehicleLocation[uid]: null;
				vehicleLocation[uid] = {latlng: latlng, dir: dir};
				log("Changing " + uid + " status to " + JSON.stringify(vehicleLocation[uid]));
				response.writeHead(200, {'Content-Type': 'text/plain'});
				response.end("Thank You.");
				checkLatlng(uid, oldlatlng).then(function (result) {
					if (result) {
						log("Proximity to signal " + result.did + " detected!!!!!!!!!!!!!!!")
						log("Distance: " + result.dist);
					}
				}).catch((e) => log(e));
			} else {
				response.writeHead(403, {'Content-Type': 'text/plain'});
				response.end("Auth failed.");
			}
		} else if (requrl.startsWith("/location/update")) {
			var body = '';
			request.on('data', (chunk) => {
				body += chunk;
			});
			request.on('end', function () {
				var post = qs.parse(body);
				var uid = post.pass;
				log(JSON.stringify(post));
				if (userPass[uid]) {
					var dir = parseFloat(post.bearing);
					var latlng = {lat: parseFloat(post.lat), lng: parseFloat(post.lng)};
					oldlatlng = vehicleLocation[uid]? vehicleLocation[uid]: null;
					vehicleLocation[uid] = {latlng: latlng, dir: dir};
					log("Changing " + uid + " status to " + JSON.stringify(vehicleLocation[uid]));
					response.writeHead(200, {'Content-Type': 'text/plain'});
					response.end("Thank You for location.");
					checkLatlng(uid, oldlatlng).then(function (result) {
						if (result) {
							log("Proximity to signal " + result.did + " detected!!!!!!!!!!!!!!!")
							log("Distance: " + result.dist);
						}
					}).catch((e) => log(e));
				} else {
					log("Auth failed.")
					response.writeHead(403, {'Content-Type': 'text/plain'});
					response.end("Auth failed.");
				}
			});
		} else if (requrl.startsWith("/location/list")) {
			var tok = requrl.split('/');
			if (tok[3]) {
				response.writeHead(200, {'Content-Type': 'application/json'});
				// log(JSON.stringify(vehicleLocation[tok[3]]));
				if (vehicleLocation[tok[3]])
					response.write(JSON.stringify(vehicleLocation[tok[3]].latlng));
				else
					response.write("{\"lat\":0, \"lng\":0}");
				response.end();
			} else {
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.write(JSON.stringify(vehicleLocation, 0, " "));
				response.end();
			}
		}
	} else if (requrl.startsWith("/device")) {
		if (requrl.startsWith("/device/action")) {
			var did = requrl.split('/')[3];
			response.writeHead(200, {'Content-Type': 'text/plain'});
			if (deviceAction[did]) {
				var d = deviceAction[did];
				response.end(d.severity + "\n" + d.dir + "\n" + d.dist);
			} else {
				response.end("0\n0\nInf");
			}
		} else if (requrl.startsWith("/device/change")) {
			var did = requrl.split('/')[3];
			var status = requrl.split('/')[4];
			deviceStatus[did] = status;
			log("Changing " + did + " status to " + JSON.stringify(status));
			response.writeHead(200, {'Content-Type': 'text/plain'});
			response.end("Thank You.");
		} else if (requrl.startsWith("/device/list")) {
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.write(JSON.stringify(deviceStatus, 0, " "));
			response.end();
		}
	} else if (requrl.startsWith("/checkotp")) {
		var body = '';
		request.on('data', (chunk) => {
			body += chunk;
		});
		request.on('end', function () {
			var post = qs.parse(body);
			var pass = post.otp;
			log("checkotp: " + JSON.stringify(post));
			if (userPass[pass]) {
				response.writeHead(200, {'Content-Type': 'text/plain'});
				response.end("Thank You for Auth.");
			} else {
				log("checkotp: Auth failed.");
				response.writeHead(403, {'Content-Type': 'text/plain'});
				response.end("Auth failed.");
			}
		});
	} else if (requrl.startsWith("/log")) {
		fs.readFile("log", (err, data) => {
			if (err) {
				response.writeHead(404, {'Content-Type': 'text/plain'});
				response.write("Empty log.");
			} else {
				response.writeHead(200, {'Content-Type': 'text/plain'});
				response.write(data.toString());
			}
			response.end();
		});
	} else if (requrl.startsWith("/god")) {
		fs.readFile("godview.html", (err, data) => {
			if (err) {
				response.writeHead(404, {'Content-Type': 'text/plain'});
				response.write("Empty.");
			} else {
				response.writeHead(200, {'Content-Type': 'text/html'});
				response.write(data.toString());
			}
			response.end();
		});
	} else if (requrl == "/") {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end("Welcome to GCX.");
	} else {
		response.writeHead(404, {'Content-Type': 'text/plain'});
		response.end("Welcome to GCX. \r\n404 Page Not found.");
	}
}).listen(PORT, function () {
	log("Server running on port " + PORT);
});

/*
Below is the main server code to handle  a device based on the severity of an ambulance close to that device.
First the current location is obtained.
If the signal behind him is found to be green, it is changed to red.
Else, depending on the distance and the angle of the ambulance toward the approaching signal,
The ambulance is assigned a severity value, which can take following values:

severity : 0  => IGNORE
severity : 1  =>  INCOMING (distance <= 1000 m)
severity : 2  =>  NEARBY (distance <= 500 m)
severity : 3  =>  CLOSE (distance <= 200 m)
severity : 4  =>  ONSIGNAL (distance <= 100 m)

*/
function checkLatlng(user, oldlatlng) {
	var latlng = vehicleLocation[user].latlng;
	return new Promise(function (resolve, reject) {
		for (var i in deviceAction) {
			if (deviceAction[i].by == user) {
				log("Action " + JSON.stringify(deviceAction[i]) + " cleared.")
				delete deviceAction[i];
			}
		}
		var direc = vehicleLocation[user].dir; // This is bearing.
		var distArray = [], j = 0;
		for (var i in deviceLocations) {
			// log(deviceLocations[i]);
			var distac = dist(latlng, deviceLocations[i]);
			// distArray[j] = {dist: distac, ld: distac/mul, id: i};
			distArray[j] = {dist: distac, id: i, ang: dir(latlng, deviceLocations[i])};
			j++;
		}
		distArray.sort((a, b) => a.dist - b.dist);
		log(direc);
		log(JSON.stringify(distArray));
		for (var i in distArray) {
			var ll = deviceLocations[distArray[i].id];
			var d = distArray[i].dist;
			var ang = distArray[i].ang;//dir(latlng, ll);
			//TODO: need to take care of directions.
			if (d <= 100 && Math.abs(ang - direc) <= 60) {
				resolve({did: distArray[i].id, dist: d, severity: distance.onsignal});
				return;
			}
			if (d <= 200 && Math.abs(ang - direc) <= 90) {
				resolve({did: distArray[i].id, dist: d, severity: distance.close});
				return;
			}
			if (d <= 500 && Math.abs(ang - direc) <= 120) {
				resolve({did: distArray[i].id, dist: d, severity: distance.nearby});
				return;
			}
			if (d <= 1000 && Math.abs(ang - direc) <= 150) {
				resolve({did: distArray[i].id, dist: d, severity: distance.incoming});
				return;
			}
		}
		reject("No nearest Signal found!!");
	}).then(function (d) {
		if (d) {
			var ang = dir(deviceLocations[d.did], latlng);
			var sig_dir = 0;
			for (var i in deviceDirections[d.did]) {
				var e = deviceDirections[d.did][i];
				if (e.left <= ang && ang <= e.right) {
					sig_dir = parseInt(i)+1;
					break;
				}
			}
			deviceAction[d.did] = {severity: d.severity, dist: d.dist, dir: sig_dir, by: user};
			log("New action added. " + JSON.stringify(deviceAction[d.did]));
		}
		return d;
	});
}

const R = 6378.137;	// Radius of earth.
function distHaver(a, b) {	// CPU Intense. Unused for now.
	var x = (a.lat - b.lat) * Math.PI / 180;
	var y = a.lng - b.lng;
	var a = Math.sin(x/2) * Math.sin(x/2);
	a += Math.sin(y/2) * Math.sin(y/2);
	a += Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = R * c;
	return d * 1000;
}

function distHaver2(a, b){  // generally used geo measurement function
	var dLat = b.lat * Math.PI / 180 - a.lat * Math.PI / 180;
	var dLon = b.lng * Math.PI / 180 - a.lng * Math.PI / 180;
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
	Math.sin(dLon/2) * Math.sin(dLon/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = R * c;
	return d * 1000; // meters
}

const mul = 1000 * R; // Converter from latlng to meters. or 6370514.858
// const mul = 50; // Converter from latlng to meters. For Test.
function distOpt(a, b) {
	var x = a.lat - b.lat, y = a.lng - b.lng;
	return Math.sqrt(x * x + y * y) * mul;
}
var dist = (a, b) => distHaver2(a, b);	// Use Optimised distance function instead of CPU Intense Haversine.

const dir_mul = 180 / Math.PI; // Radians to degrees.
function dir(a, b) {
	var y = b.lat - a.lat, x = b.lng - a.lng;
	return Math.atan2(y, x) * dir_mul;
}
