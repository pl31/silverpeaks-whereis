(function () {
	"use strict";
}());

var whereis = whereis || {};

whereis.ui_enabled = null;

whereis.loader_queue = $({});
whereis.image_array = null;
whereis.image_array_new_images_index = null;
whereis.track_array = null;

whereis.files_to_load_counter = 0;
whereis.files_loaded_counter = 0;

whereis.init = function () {
	// bind window drop events - prevent browser image load action
	$(window).bind("dragover dragleave", whereis.no_defaultOperation);
	// bind drop event to drop zone
	$("#drop_zone").bind("dragover", whereis.no_defaultOperation);
	$("#drop_zone").bind("drop", whereis.drop_zone_drop);
	// and finally the onchange event for the file input
	$("#file_selector").bind("change", whereis.file_input_change);

	// hack for older chrome versions
	window.URL = window.URL || window.webkitURL;

	// check for console, and implement dummy functions if none are available
	if (!window.console) {
		window.console = {};
	}
	window.console.error = window.console.error || function () {};
	window.console.warn = window.console.warn || function () {};
	window.console.info = window.console.info || function () {};
	window.console.log = window.console.log || function () {};

	// ui is disabled by default, so enable it
	whereis.ui_enable(true);
};

whereis.reportException = function(message, error) {
	console.error(message);
	//alert(err);
}

whereis.getLoaderQueue = function () {
	return whereis.loader_queue;
};

whereis.showStatus = function(text)
{
	$("#status_line").html(text);
}

whereis.show_map = function (enabled) {
	if (enabled) {
		$("#home_area").css("display", "none");
		$("#map_area").css("display", "block");
	} else {
		$("#home_area").css("display", "block");
		$("#map_area").css("display", "none");
	}
};

whereis.ui_enable = function (enabled) {
	whereis.ui_enabled = enabled;

	if (enabled) {
		$("#file_selector").removeAttr("disabled");
		$("#menu_w2").removeClass("menu_disabled");
		$("#status_line").addClass("invisible");
	} else {
		$("#file_selector").attr("disabled", true);
		$("#menu_w2").addClass("menu_disabled");
		$("#status_line").removeClass("invisible");
	}
};

whereis.no_defaultOperation = function (je) {
	var e = je.originalEvent;
	e.stopPropagation();
	e.preventDefault();
};

whereis.drop_zone_drop = function (je) {
	whereis.no_defaultOperation(je);

	var e = je.originalEvent;
	var dt = e.dataTransfer;
	var files = dt.files;

	// TODO: can I avoid the get(0)
	if (this === $("#drop_zone").get(0)) {
		whereis.queue_file_reader(files, false);
	}
};

whereis.file_input_change = function (je) {
	whereis.no_defaultOperation(je);
	var e = je.originalEvent;

	whereis.queue_file_reader(e.target.files, false);
};

whereis.image_tag = function (file) {
	return file.name + ";" + file.size + ";" + (file.lastModified || "");
};

whereis.contains_image = function (file) {
	var i;
	for (i = 0; i < whereis.image_array.length; i = i + 1) {
		if (whereis.image_array[i].fileTag == whereis.image_tag(file)) {
			console.warn(file.name + ": schon geladen - wird nicht erneut geladen.");
			return true;
		}
	}
	return false;
};

whereis.queue_file_reader = function (files, newmap) {
	// check ui state --> possible drag or open event
	if (!whereis.ui_enabled) {
		return;
	}
	whereis.ui_enable(false);

	whereis.files_to_load_counter = 0;
	whereis.files_loaded_counter = 0;

	try {
		if (!whereis.image_array || newmap) {
			whereis.image_array = [];
		}
		if (!whereis.track_array || newmap) {
			whereis.track_array = [];
		}
		whereis.image_array_new_images_index = whereis.image_array.length;

		$.each(files, function (index, file) {
			whereis.getLoaderQueue().queue("loaderqueue", function () {
				whereis.read_file(file);
			});
			whereis.files_to_load_counter++;
		});
		whereis.showStatus("Zu ladende Dateien: " + whereis.files_to_load_counter);
	} catch (err) {
		whereis.reportException("fileapi addimages_2", err);
	} finally {
		whereis.getLoaderQueue().queue("loaderqueue", function () {
			whereis.show_on_map();
		});
		whereis.getLoaderQueue().dequeue("loaderqueue");
	}
};

whereis.read_file = function (file) {
	try {
		if (file.type.match("image.*")) {
			if (!whereis.contains_image(file)) {
				var binaryReader = new FileReader();
				binaryReader.file = file; // for later access
				binaryReader.onloadend = whereis.image_loaded;
				// here I assume, that exif is part of the first 100k
				file.slice = file.slice || file.mozSlice || file.webkitSlice;
				if (file.slice)
					binaryReader.readAsArrayBuffer(file.slice(0, Math.min(100 * 1024, file.size)));
				else
					binaryReader.readAsArrayBuffer(file);
			} else {
				whereis.getLoaderQueue().dequeue("loaderqueue");
				whereis.files_loaded_counter++;
				whereis.showStatus("Dateien geladen: " + whereis.files_loaded_counter + "/" + whereis.files_to_load_counter);
			}
		} else {
			var textReader = new FileReader();
			textReader.file = file; // for later access
			textReader.onloadend = whereis.text_loaded;
			textReader.readAsText(file);
		}
	} catch (err) {
		whereis.getLoaderQueue().dequeue("loaderqueue");
		whereis.reportException(file.name + ": Fehler beim Lesen der Datei (start loading).", err);
	}
};

whereis.image_loaded = function (e) {
	try {
		var file;
		var image_properties = {};
		try {
			file = e.target.file;

			if (e.target.error) {
				whereis.reportException(file.name + ": Fehler beim Lesen der Datei (loaded[1]).");
				return;
			}

			image_properties.filename = file.name;
			image_properties.fileTag = whereis.image_tag(file); // tag file to check for duplicates
		} catch (err) {
			var filename = "<Unbekannter Dateiname>";
			if (file && file.name) {
				filename = file.name;
			}
			whereis.reportException(filename + ": Fehler beim Lesen der Datei (loaded[2]).", err);
		}

		var exif;
		try {
			exif = EXIF.readFromDataView(new DataView(e.target.result));
		} catch (err) {
			whereis.reportException(file.name + ": Fehler beim Parsen der exif-Daten", err);
		}
		if (exif != null && exif != false) {
			if (exif.GPSLatitude && exif.GPSLongitude) {
				var latitude = exif.GPSLatitude[0] + exif.GPSLatitude[1] / 60.0 + exif.GPSLatitude[2] / 3600.0;
				var longitude = exif.GPSLongitude[0] + exif.GPSLongitude[1] / 60.0 + exif.GPSLongitude[2] / 3600.0;


				if (exif.GPSLatitudeRef && exif.GPSLatitudeRef[0] == "S") {
					latitude = -latitude;
				}
				if (exif.GPSLongitudeRef && exif.GPSLongitudeRef[0] == "W") {
					longitude = -longitude;
				}

				// tolerant check
				if (latitude >= -90 && latitude <= 90 &&
					longitude >= -360 && longitude <=360)
				{
					image_properties.latitude = latitude;
					image_properties.longitude = longitude;

					// create File URL if possible to show thumbnail
					if (window.URL) {
						image_properties.fileURL = window.URL.createObjectURL(file);
					}
					// orientation to set style for rotation of thumb
					if (exif.Orientation) {
						image_properties.Orientation = exif.Orientation;
					}

					// now we get additional infos
					// date for sort order
					if (exif.DateTimeOriginal) {
						image_properties.date = exif.DateTimeOriginal;
					} else if (exif.DateTimeDigitized) {
						image_properties.date = exif.DateTimeDigitized;
					} else if (exif.DateTime) {
						image_properties.date = exif.DateTime;
					}
					whereis.image_array.push(image_properties);
				} else {
					console.warn(file.name + ": enthält ungueltige geotags in exif-Daten.");
				}
			} else {
				console.warn(file.name + ": enthält keine geotags in exif-Daten.");
			}
		} else {
			console.warn(file.name + ": enthält keine exif-Daten.");
		}
	} finally {
		whereis.getLoaderQueue().dequeue("loaderqueue");
		whereis.files_loaded_counter++;
		whereis.showStatus("Dateien geladen: " + whereis.files_loaded_counter + "/" + whereis.files_to_load_counter);
	}
};

whereis.text_loaded = function (e) {
	try {
		var track = [];
		var text = e.target.result;
		var xml = $.parseXML(text);
		$(text).find("trkseg").each(function () {
			var segment = [];
			track.push(segment);
			$(this).find("trkpt").each(function () {
				var point = {
					lng: $(this).attr("lon"),
					lat: $(this).attr("lat")
				};
				segment.push(point);
			});
		});
		if (track.length > 0) {
			whereis.track_array.push(track);
		}
		if (whereis.track_array.length == 0) {
			console.warn(e.target.file.name + ": unbekannter Dateityp");
		}
	} catch (err) {
		whereis.reportError("fileapi text_loaded", err);
	} finally {
		whereis.getLoaderQueue().dequeue("loaderqueue");
		whereis.files_loaded_counter++;
		whereis.showStatus("Dateien geladen: " + whereis.files_loaded_counter + "/" + whereis.files_to_load_counter);
	}
};

whereis.show_on_map = function () {
	try {
		if ((whereis.image_array && whereis.image_array.length > 0) || (whereis.track_array && whereis.track_array.length > 0)) {
			whereis.show_map(true); // switch viewport
			if (!map.initMap(whereis.image_array, whereis.image_array_new_images_index, whereis.track_array)) {
				whereis.show_map(false);
			}
		}
	} catch (err) {
		whereis.reportException("fileapi show_on_map", err);
	} finally {
		whereis.ui_enable(true);
	}
};
