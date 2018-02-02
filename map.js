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

	// show images
	for (i = image_array_new_images_index; i < image_array.length; ++i) {
		try {
			map.addImage(image_array[i]);
		}
		catch (e) {
			console.error("map initmap_4");
		}
	}

	// sort image_array, update marker
	image_array.sort(map.sortByDate);
	for (i = 0; i < image_array.length; ++i) {
		try {
			var fontSize;
			if (i+1 < 100) fontSize = "small";
			else if (i+1 < 1000) fontSize = "x-small";
			else fontSize = "xx-small"
			
			image_array[i].marker.setLabel({ text: (i+1).toString(), fontSize: fontSize });
			image_array[i].marker.setZIndex(-i);
		}
		catch (e) {
			console.error("map initmap_5");
		}
	}

	return true;
};

map.addImage = function (image_properties) {
	var latlng = new google.maps.LatLng(image_properties.latitude, image_properties.longitude);
	var marker = new google.maps.Marker({
		draggable: false,
		raiseOnDrag: false,
		map: google_map,
		position: latlng
	});
	image_properties.marker = marker;

	// title: title    

	// add info window
	var bubble_content = "";
	bubble_content += "<h3>" + image_properties.filename + "</h3>";
	if (image_properties.fileURL) {
		bubble_content += "<div align=\"center\" style=\"width: 300px; height:182px; overflow: hidden;\">";
		var image_class = "";
		if (image_properties.Orientation && image_properties.Orientation >= 1 && image_properties.Orientation <= 8)
			image_class = "exif_orientation_" + image_properties.Orientation;
		bubble_content += "<img height=\"180\" class=\"" + image_class + "\"  style=\"padding: 0px; margin: 0px;\" alt=\"thumbnail\" src=\"" + image_properties.fileURL + "\" />";
		bubble_content += "</div>";
	}

	google.maps.event.addListener(marker, 'click', function () {
		if (infowindow) infowindow.close();
		infowindow = new google.maps.InfoWindow({
			content: bubble_content
		});
		infowindow.open(google_map, marker);
	});
};
