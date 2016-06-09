var exec = require('./module/exec');

var conf = {};

var async = require('async');
var _ = require('lodash');
var request = require('request');
var WebSocketClient = require('websocket').client;

var hostname = function (proto) {
    if (proto == 'ws') {
        host = 'ws://' + conf.websimconnect.host + ':' + conf.websimconnect.ws;
    } else {
        host = 'http://' + conf.websimconnect.host + ':' + conf.websimconnect.http;
    }
    return host + '/';
};

function calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    lat1 = toRad(lat1);
    lat2 = toRad(lat2);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

// Converts numeric degrees to radians
function toRad(Value) {
    return Value * Math.PI / 180;
}

function toNM(value) {
    return value *= 0.53996;
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

module.exports = function (nodecg) {
    conf = {
        websimconnect: {
            dir: nodecg.bundleConfig.dir || './WebSimConnect',
            host: nodecg.bundleConfig.host || "localhost",
            http: nodecg.bundleConfig.http || 8080,
            ws: nodecg.bundleConfig.ws || 8088
        },
        definition: 'nodecgoverlay',
        init: nodecg.bundleConfig.init || false,
        ws: null
    };

    var flightRoute = nodecg.Replicant('route');
    var callsign = nodecg.Replicant('callsign');

    var flightData = {
        plane: nodecg.Replicant('airplane', {
            defaultValue: {
                position: {
                    lat: 0,
                    lon: 0
                },
                speed: 0,
                altitude: 0,
                heading: 0,
                autopilot: 0,
                gears: 0
            }
        }),
        departure: nodecg.Replicant('departure', {
            defaultValue: {
                code: null,
                name: null,
                country: null,
                position: {
                    lat: 0,
                    lon: 0
                }
            }
        }),
        destination: nodecg.Replicant('destination', {
            defaultValue: {
                code: null,
                name: null,
                country: null,
                position: {
                    lat: 0,
                    lon: 0
                }
            }
        }),
        journey: nodecg.Replicant('journey', {
            defaultValue: {
                pct: 0,
                distance: {
                    total: 0,
                    remaining: 0
                }
            }
        }),
        general: nodecg.Replicant('general', {
            defaultValue: {
                type: null,
                model: null,
                id: null,
                airline: null
            }
        }),
        time: nodecg.Replicant('time')
    };

    var pushAircraftData = function (data) {
        flightData.general.value = {
            type: data.atc.type,
            model: data.atc.model,
            id: data.atc.id,
            airline: data.atc.airline
        };
    };

    var pushAvionicsFeed = function (data) {
        flightData.plane.value = {
            position: {
                lat: data.lat,
                lon: data.lon
            },
            speed: data.speed,
            altitude: data.alt,
            heading: data.heading,
            autopilot: data.autopilot,
            gears: data.gears
        };
        calculateDistance(data.lat, data.lon);
    };

    var calculateDistance = function (lat, lon) {
        flightData.journey.value.distance.remaining = Math.round(toNM(calcCrow(
			lat,
			lon,
			flightData.destination.value.position.lat,
			flightData.destination.value.position.lon
		)));
        flightData.journey.value.pct = Math.round(100 - (flightData.journey.value.distance.remaining / flightData.journey.value.distance.total * 100));
        return null;
    };

    var getJSON = function (req, cb) {
        nodecg.log.info('getJSON', { url: hostname('http') + req });
        request({ url: hostname('http') + req }, function (err, res, body) {
            if (_.isUndefined(cb)) return true;
            if (err) {
                nodecg.log.error('getJSON', err);
                return cb(err);
            }
            if (IsJsonString(body)) {
                return cb(null, JSON.parse(body));
            } else {
                return cb(null, body);
            }
        });
    };

    var getData = function () {
        var commands = [
			'clear_definition?name=def&',
			'add_definition?name=localtime&PropertyName=Local time&UnitName=Seconds&DatumType=INT32',
			'add_definition?name=lat&PropertyName=Plane Latitude&UnitName=degrees&DatumType=FLOAT32',
			'add_definition?name=lon&PropertyName=Plane Longitude&UnitName=degrees&DatumType=FLOAT32',
			'add_definition?name=altitude&PropertyName=Plane Altitude&UnitName=feet&DatumType=FLOAT32',
			'add_definition?name=heading&PropertyName=PLANE HEADING DEGREES TRUE&UnitName=degrees&DatumType=FLOAT32',
			'add_definition?name=speed&PropertyName=GROUND VELOCITY&UnitName=knots&DatumType=FLOAT32',
			'add_definition?name=atc_type&PropertyName=ATC TYPE&DatumType=STRING256',
			'add_definition?name=atc_model&PropertyName=ATC MODEL&DatumType=STRING256',
			'add_definition?name=atc_id&PropertyName=ATC ID&DatumType=STRING256',
			'add_definition?name=atc_airline&PropertyName=ATC AIRLINE&DatumType=STRING256',
			'add_definition?name=gears&PropertyName=GEAR HANDLE POSITION&UnitName=Bool&DatumType=INT32',
			'add_definition?name=autopilot&PropertyName=AUTOPILOT MASTER&UnitName=Bool&DatumType=INT32',
			'add_message?name=SIMCONNECT_RECV_ID_SIMOBJECT_DATA',
			'start_interval?period=SIMCONNECT_PERIOD_VISUAL_FRAME&interval=100'
        ];

        async.eachSeries(commands, function (command, callback) {
            getJSON(command + '&definition_name=' + conf.definition, callback);
        },
		// optional callback
		function (err, results) {
			if (err) return nodecg.log.error('There was an error');
			nodecg.log.info('WebSimConnect connected');
			getWS();
		});
    };

    var getWS = function () {
        var client = new WebSocketClient();

        client.on('connectFailed', function (error) {
            nodecg.log.error('Connect Error: ' + error.toString());
        });

        client.on('connect', function (connection) {
            nodecg.log.info('WebSocket Client Connected');
            connection.on('error', function (error) {
                nodecg.log.error("Connection Error: " + error.toString());
            });
            connection.on('close', function () {
                nodecg.log.info('echo-protocol Connection Closed');
            });
            connection.on('message', function (message) {
                if (IsJsonString(message.utf8Data)) {
                    return processWSMessageThrottled(JSON.parse(message.utf8Data));
                } else {
                    return processWSMessageThrottled(message.utf8Data);
                }
            });
        });

        nodecg.log.info('WS', 'Connecting', hostname('ws') + 'open_socket');
        client.connect(hostname('ws') + 'open_socket');
    };

    var processWSMessage = function (event) {
        switch (event.message) {
            case 'SIMCONNECT_RECV_ID_SIMOBJECT_DATA':
                var data = {
                    lat: event.value.lat,
                    lon: event.value.lon,
                    alt: event.value.altitude,
                    heading: event.value.heading,
                    speed: event.value.speed,
                    gears: event.value.gears,
                    autopilot: event.value.autopilot,
                    atc: {
                        type: event.value.atc_type,
                        model: event.value.atc_model,
                        id: event.value.atc_id,
                        airline: event.value.atc_airline
                    }
                };
                pushAvionicsFeed(data);
                pushAircraftDataThrottled(data);
                flightData.time.value = event.value.localtime;
                break;
        }
    };

    var processWSMessageThrottled = _.throttle(processWSMessage, 1000, { 'trailing': false });
    var pushAircraftDataThrottled = _.throttle(pushAircraftData, 60000, { 'trailing': false });

    var getAirportData = function (airport, cb) {
        request({ url: 'https://h1vag64xz9.execute-api.eu-west-1.amazonaws.com/prod/airports/' + airport }, function (err, res, body) {
            if (err) return cb(err);
            if (res.statusCode != 200) return cb(null, null);
            if (!IsJsonString(body)) return cb(null, null);
            cb(null, JSON.parse(body));
        });
    };

    var getAirportObject = function (code, next) {
        nodecg.log.info('>>', 'getAirportObject', 'fetch', code);
        getAirportData(code, function (err, res) {
            if (err) return next(null, false);
            if (res === null) return next(null, null);
            nodecg.log.info('>>', 'getAirportObject', 'result', code);
            next(null, {
                code: code,
                name: res.name,
                city: res.city,
                country: res.country,
                position: {
                    lat: res.loc.lat,
                    lon: res.loc.lon,
                    alt: res.loc.alt
                }
            });
        });
    };

    var fetchVatsimData = function (callsign, next) {
        nodecg.log.info('>>', 'fetchVatsimData', 'fetch', callsign);
        request({
            url: 'http://api.vateud.net/online/callsign/' + callsign + '.json'
        }, function (err, res, body) {
            if (err) return next(err);
            if (IsJsonString(body)) {
                var obj = JSON.parse(body);
                if (_.isEmpty(obj)) return next(null, null);
                nodecg.log.info('>>', 'fetchVatsimData', 'result', callsign);
                return next(null, _.first(obj));
            }
            next(null, null);
        });
    };

    var startup = function () {
        nodecg.log.info('>>', 'Starting FlightStream');

        if (conf.init) {
            if (_.isUndefined(conf.websimconnect.http)) return nodecg.log.error('Websimconnect configuration error, missing HTTP port');
            if (_.isUndefined(conf.websimconnect.ws)) return nodecg.log.error('Websimconnect configuration error, missing WS port');
            if (_.isUndefined(conf.websimconnect.dir)) return nodecg.log.error('Websimconnect configuration error, missing executable directory');

            nodecg.log.info('WebSimConnect startup');

            exec.exec("WebSimConnect.exe", ["-port=" + conf.websimconnect.http, "-websocketport=" + conf.websimconnect.ws, "-start"], conf.websimconnect.dir, null, function (error, stdout, stderr) {
                if (error) return nodecg.log.error(error);
                nodecg.log.info('WebSimConnect spawned');
                getData();
            });
        } else {
            nodecg.log.info('Assumin WebSimConnect has already spawned');
            getData();
        }
    };

    callsign.on('change', function (oldValue, newValue) {
        if (_.isUndefined(newValue)) return;
        if (newValue === '') return;
        nodecg.log.info('>>', 'callsign.on.change', 'fetch', newValue);
        async.retry({ times: 5, interval: (2 * 60 * 1000) }, function (next, result) {
            fetchVatsimData(newValue, function (err, res) {
                if (err) return next(err);
                if (res === null) return next('Not found');
                next(null, res);
            });
        }, function (err, result) {
            if (err) return nodecg.log.error(err);
            flightRoute.value = {
                departure: result.origin,
                destination: result.destination,
                plan: {
                    route: result.route,
                    cruise: result.planned_altitude
                }
            };
        });
    });

    flightRoute.on('change', function (oldValue, newValue) {
        async.auto({
            departure: function (cb) {
                if (_.get(newValue, 'departure', null) == null) return cb(null, false);
                if (newValue.departure != flightData.departure.value.code) {
                    getAirportObject(newValue.departure, function (err, res) {
                        if (err) return cb(null, false);
                        if (res === null) return cb(null, false);
                        flightData.departure.value = res;
                        cb(null, true);
                    });
                } else {
                    cb(null, false);
                }
            },
            destination: function (cb) {
                if (_.get(newValue, 'destination', null) == null) return cb(null, false);
                if (newValue.destination != flightData.destination.value.code) {
                    getAirportObject(newValue.destination, function (err, res) {
                        if (err) return cb(null, false);
                        if (res === null) return cb(null, false);
                        flightData.destination.value = res;
                        cb(null, true);
                    });
                } else {
                    cb(null, false);
                }
            },
            calc: ['departure', 'destination', function (results, cb) {
                if (results.departure === false && results.destination === false) return cb(null, false);
                flightData.journey.value.distance.total = toNM(calcCrow(
					flightData.departure.value.position.lat,
					flightData.departure.value.position.lon,
					flightData.destination.value.position.lat,
					flightData.destination.value.position.lon
				));
                cb(null, true);
            }]
        }, function (err, res) {
            if (err) return nodecg.log.error(err);
            return true;
        });
    });

    startup();
};