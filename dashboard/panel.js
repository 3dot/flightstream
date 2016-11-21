'use strict';

var message = nodecg.Replicant('message');
var callsign = nodecg.Replicant('callsign');
var fixedroute = nodecg.Replicant('fixedroute');

$('#fsUpdateAirports').click(function (e) {
	e.preventDefault();
    message.value = $('#fsGeneralMessage').val();
    callsign.value = $('#fsPilotCallsign').val();
    fixedroute.value = {
    	vatsim: function() {
    		if ($('#fsPilotVatsimCheck').is(':checked')) return true;
    		return false;
    	}(),
    	callsign: $('#fsPilotCallsign').val(),
    	departure: $('#fsRouteFixedDeparture').val(),
    	destination: $('#fsRouteFixedDestination').val()
    };
});