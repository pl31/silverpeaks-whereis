(function () {
	"use strict";
}());

var map = map || {};

var google_map;
var infowindow;

map.sortByDate = function (a, b) {
	return (a.date == b.date) ? 0 : (a.date > b.date) ? 1 : -1;
}

map.createMarkerImage = function (text) {
	var svg =
		'<svg xmlns="http://www.w3.org/2000/svg" width="30px" height="26px">' +
		'<path fill="salmon" stroke="black" stroke-width="1" shape-rendering="crispEdges" d="M2,25L2,17L1,17L1,5L2,5L2,4L28,4L28,5L29,5L29,17L28,17L28,18L9,18Z"/>' +
		'<svg x="2" y="6" width="24" height="11">' +
		'<text x="13" y="9" letter-spacing="-1" font-stretch="condensed" style="text-anchor: middle; font-family: Arial; font-size: 11px;">' +
		text + '</text></svg></svg>';
	return 'data:image/svg+xml;base64,' + window.btoa(svg);
}

map.showMap = function () {
	if (!google_map) {
		var mapOptions = {
			center: new google.maps.LatLng(0,0),
            zoom: 4,
			mapTypeId: google.maps.MapTypeId.HYBRID
		};
		google_map = new google.maps.Map(document.getElementById("sp-map"), mapOptions);
	}
	else
		google.maps.event.trigger(google_map, 'resize');
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
		var mapOptions = {
			mapTypeId: google.maps.MapTypeId.HYBRID
		};
		google_map = new google.maps.Map(document.getElementById("sp-map"), mapOptions);
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
	for (i = 0; i < image_array.length; ++i) {
		try {
			if (image_array[i].marker)
				image_array[i].marker.setMap(null);

			var marker = new google.maps.Marker({
				map: google_map,
				draggable: false,
				raiseOnDrag: false,
				position: { lat: image_array[i].latitude, lng: image_array[i].longitude },
				icon: new google.maps.MarkerImage(
					map.createMarkerImage(i + 1),
					new google.maps.Size(30, 26),
					new google.maps.Point(0, 0),
					new google.maps.Point(1, 26)),
				shape: { type: 'poly', coord: [26, 4, 27, 5, 27, 6, 27, 7, 27, 8, 27, 9, 27, 10, 27, 11, 27, 12, 27, 13, 27, 14, 27, 15, 27, 16, 27, 17, 26, 18, 7, 19, 6, 20, 5, 21, 4, 22, 3, 23, 2, 24, 1, 25, 1, 25, 1, 24, 1, 23, 1, 22, 1, 21, 1, 20, 1, 19, 1, 18, 0, 17, 0, 16, 0, 15, 0, 14, 0, 13, 0, 12, 0, 11, 0, 10, 0, 9, 0, 8, 0, 7, 0, 6, 0, 5, 1, 4, 26, 4] },
					zIndex: -i
			});
			image_array[i].marker = marker;

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
				return function () {
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

	return true;
};
