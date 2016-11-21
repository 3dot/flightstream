var flightData = {
    plane: nodecg.Replicant('airplane'),
	departure: nodecg.Replicant('departure'),
	destination: nodecg.Replicant('destination'),
	journey: nodecg.Replicant('journey'),
	general: nodecg.Replicant('general'),
	time: nodecg.Replicant('time'),
	route: nodecg.Replicant('route')
};

var message = nodecg.Replicant('message');
var callsign = nodecg.Replicant('callsign');

var display;

$(function() {
	(function(){
	    setTimeout(function() {
	    	initMap();
	    	$('body').fadeIn();
	    }, 1000);
	})();

	flightData.departure.on('change', function(newValue, oldValue) {
		if (!newValue) return;
		display.route.departure(newValue.city + ', ' + newValue.country);
	});

	flightData.destination.on('change', function(newValue, oldValue) {
		if (!newValue) return;
		display.route.destination(newValue.city + ', ' + newValue.country);
	});

	flightData.plane.on('change', function(newValue, oldValue) {
		if (!newValue) return;
		display.state.gears(newValue.gears);
		display.state.autopilot(newValue.autopilot);
		display.state.speed(newValue.speed);
		display.state.altitude(newValue.altitude);
		display.state.map(newValue.position.lat, newValue.position.lon, newValue.heading);
	});

	flightData.journey.on('change', function(newValue, oldValue) {
		if (!newValue) return;
		if (!oldValue) {
			display.route.distance(newValue.distance.remaining);
			display.route.pct(newValue.pct);
		} else {
			if (oldValue.distance.remaining != newValue.distance.remaining) {
				display.route.distance(newValue.distance.remaining);
			}
			if (newValue.pct != oldValue.pct) display.route.pct(newValue.pct);
		}
	});

	flightData.time.on('change', function(newValue, oldValue) {
		if (toTime(oldValue) != toTime(newValue)) $('#local_time').text(toTime(newValue));
	});

	flightData.general.on('change', function (newValue, oldValue) {
		if (!newValue) return;
		$('#plane_type').text(newValue.model);
		$('#plane_id').text(newValue.id);
		var logo = function (airline) {
		    return '<img src="img/' + airline.toLowerCase() + '.png" alt="" style="height: 35px;">';
		}
		$('#plane_manufacturer').html(logo(newValue.type));
	});

	message.on('change', function(newValue, oldValue) {
	    $('#generalMessage').fadeOut('slow', function () {
	    	if (!newValue) return;
			$('span', this).text(newValue);
			$(this).fadeIn();
		});
	});

	callsign.on('change', function(newValue, oldValue) {
		$('#flight_id').text(newValue);
	});

	display = {
		route: {
			distance: function(value) {
				if (value < 10) value = '<10';
				$('#flight_distance_remaining').text(value + ' NM');
			},
			pct: function(value) {
				$('#flightProgress div').width(value + '%');
			},
			departure: function(value) {
				$('#flight_departure').text(value);
			},
			destination: function(value) {
				$('#flight_destination').text(value);
			}
		},
		state: {
			gears: function(state) {
			    var route = [];
			    (function () {
			        if (!flightData.departure.value) return;
			        if (!flightData.destination.value) return;
			        if (!flightData.route.value.plan) return;

			        route.push(flightData.departure.value.code);
			        $.each(flightData.route.value.plan.route.split(" "), function (n, leg) {
			            route.push(leg);
			        });
			        route.push(flightData.destination.value.code);
			    })()

				if (state == 0) {
				    $('#notification_gears').fadeOut("slow", function () {
				        if (!flightData.route.value.plan) return;
				        $('#notification_route').html(route.join(' <i class="fa fa-caret-right p-r-10 p-l-10" aria-hidden="true"></i> ')).fadeIn();
				    });
				}
				if (state == 1) {
				    $('#notification_route').fadeOut("slow", function () {
				        $('#notification_gears').fadeIn();
				    });
				}
			},
			autopilot: function(state) {
				// does nothing at this time
			},
			speed: function(value) {
				var speed = Math.round(value);
				if (speed > 280) {
					zoomMap(5);
				} else if (speed > 200) {
					zoomMap(8);
				} else if (speed > 60) {
					zoomMap(10);
				} else {
					zoomMap(13);
				}
				$('#flight_speed').text(speed + ' KIAS');
			},
			altitude: function(value) {
				if (value > 10000) {
					value /= 1000;
					value = 'FL' + Math.round(value * 10);
				} else {
					value = Math.round(value) + ' feet';
				}
				$('#flight_altitude').text(value);
			},
			map: function(lat, lon, heading) {
				moveMap(lat, lon, heading);
			}
		}
	}
});

var map, marker, image;

function initMap() {
	var myLatLng = {lat: 0, lng: 0};
	map = new google.maps.Map(document.getElementById('map'), {
		center: myLatLng,
		zoom: 8,
		mapTypeId: google.maps.MapTypeId.TERRAIN,
		disableDefaultUI: true
	});
  	image = {
		path: 'M510,255c0-20.4-17.85-38.25-38.25-38.25H331.5L204,12.75h-51l63.75,204H76.5l-38.25-51H0L25.5,255L0,344.25h38.25l38.25-51h140.25l-63.75,204h51l127.5-204h140.25C492.15,293.25,510,275.4,510,255z',
		anchor: new google.maps.Point(200, 250),
		strokeColor: '#FFFFFF',
		strokeWeight: 2,
    	fillColor: '#8E1B05',
    	fillOpacity: 0.75,
    	scale: .1,
    	rotation: 0
	};
  	marker = new google.maps.Marker({
	  	icon: image,
	    position: myLatLng,
	    map: map
  	});
};

function zoomMap(level) {
	if (typeof map === 'undefined') return true;
	if (map.getZoom() == level) return true;
	map.setZoom(level);
};

function moveMap(lat, lon, heading) {
	if (typeof map === 'undefined') return true;
	var center = new google.maps.LatLng(lat, lon);
	image.rotation = heading - 90;
	map.panTo(center);
	marker.setPosition(center);
	marker.setIcon(image);
};

var toTime = function (value) {
    var sec_num = parseInt(value, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    var time    = hours+':'+minutes;
    return time;
};