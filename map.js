(function () {
	"use strict";
}());

var map = map || {};

var google_map;
var infowindow;

map.sortByDate = function (a, b) {
	return (a.date == b.date) ? 0 : (a.date > b.date) ? 1 : -1;
}

map.initMap = function (image_array, image_array_new_images_index, track_array) {
	// calculate map boundaries
	var bounds = null;
	// iterate over images
	for (var i = 0; i < image_array.length; ++i) {
		try {
			var latlng = new google.maps.LatLng(image_array[i].latitude, image_array[i].longitude);
			if (bounds == null)
				bounds = new google.maps.LatLngBounds(latlng, latlng);
			else
				bounds.extend(latlng);
		}
		catch (e) {
			console.error("map initmap_1");
		}
	}
	// create polygons from tracks
	var tracks = new Array();
	try {
		for (i = 0; i < track_array.length; ++i) { // einzelne track objekte
			for (var j = 0; j < track_array[i].length; ++j) { // einzelne segmente
				var track = new Array();
				tracks.push(track);
				for (var k = 0; k < track_array[i][j].length; ++k) {
					var point = track_array[i][j][k];
					var latlng = new google.maps.LatLng(point.lat, point.lng)
					track.push(latlng);
					if (bounds == null)
						bounds = new google.maps.LatLngBounds(latlng, latlng);
					else
						bounds.extend(latlng);
				}
			}
		}
	}
	catch (e) {
		console.error("map initmap_2");
	}

	if (bounds == null)
		return false; // TODO: Fehler anzeigen, kein Bild zum zeigen!

	// create map, and display in boundaries 
	// TODO: stupid logic to check for new
	if (image_array_new_images_index == 0 || !google_map) {
		var myOptions = {
			mapTypeId: google.maps.MapTypeId.HYBRID
		};
		google_map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
	}
	if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
		google_map.setZoom(14);
		google_map.setCenter(bounds.getCenter());
	}
	else
		google_map.fitBounds(bounds);

	// show tracks
	for (i = 0; i < tracks.length; ++i) {
		try {
			var track = new google.maps.Polyline({
				path: tracks[i],
				strokeColor: "#0000FF",
				strokeOpacity: 0.4,
				strokeWeight: 3
			});

			track.setMap(google_map);
		}
		catch (e) {
			console.error("map initmap_3");
		}
	}

	// sort image_array, show marker
	image_array.sort(map.sortByDate);

	var markers = [];
	for (i = 0; i < image_array.length; ++i) {
		try {
			var fontSize;
			if (i+1 < 100) fontSize = "small";
			else if (i+1 < 1000) fontSize = "x-small";
			else fontSize = "xx-small"
			
			if (image_array[i].marker)
				image_array[i].marker.setMap(null);

			var marker = new google.maps.Marker({
				draggable: false,
				raiseOnDrag: false,
				position: { lat: image_array[i].latitude, lng: image_array[i].longitude},
				label: { text: (i+1).toString(), fontSize: fontSize },
				zIndex: -i
			});			
			image_array[i].marker = marker;
			markers.push(marker);

			// add info window
			var bubble_content = "";
			bubble_content += "<h3>" + image_array[i].filename + "</h3>";
			if (image_array[i].fileURL) {
				bubble_content += "<div align=\"center\" style=\"width: 300px; height:182px; overflow: hidden;\">";
				var image_class = "";
				if (image_array[i].Orientation && image_array[i].Orientation >= 1 && image_array[i].Orientation <= 8)
					image_class = "exif_orientation_" + image_array[i].Orientation;
				bubble_content += "<img height=\"180\" class=\"" + image_class + "\"  style=\"padding: 0px; margin: 0px;\" alt=\"thumbnail\" src=\"" + image_array[i].fileURL + "\" />";
				bubble_content += "</div>";
			}

			google.maps.event.addListener(marker, 'click', (function (marker, bubble_content) {
				return function() {
					if (infowindow) infowindow.close();
					infowindow = new google.maps.InfoWindow({
						content: bubble_content
					});
					infowindow.open(google_map, marker);
				}
			})(marker, bubble_content));
		}
		catch (e) {
			console.error("map initmap_5");
		}
	}

	var options = {	
		imagePath: '3rdparty/gmaps-marker-clusterer/images/r',
		maxZoom: 10 
	};
	var markerCluster = new MarkerClusterer(google_map, markers, options);

	return true;
};
