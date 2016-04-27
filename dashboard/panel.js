'use strict';

var message = nodecg.Replicant('message');
var callsign = nodecg.Replicant('callsign');

$('#fsUpdateAirports').click(function (e) {
	e.preventDefault();
    message.value = $('#fsGeneralMessage').val();
    callsign.value = $('#fsPilotCallsign').val();
});