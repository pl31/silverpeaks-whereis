(function () {
	"use strict";
}());

// 2011-11-01: Patrick Kowalzick
// DataView surrogate as DataView is only part of
// working draft for "Typed Array Specification".
//   http://www.khronos.org/registry/typedarray/specs/latest/
// Dataview is only implemented in Chrome 9 
var DataView = DataView || function(arrayBuffer, offset, length) {
	
	this.byteLength = length || arrayBuffer.byteLength;
	
	var data = new Uint8Array(arrayBuffer, offset || 0, this.byteLength);

	this.getUint8 = function(offset) {
		return data[offset];
	};

	this.getInt8 = function(offset) {
		return (data[offset] - 256) % 256;
	};

	// bLE == boolLittleEndian
	this.getUint16 = function(offset, bLE) {
		var b1 = this.getUint8(offset),
			b2 = this.getUint8(offset + 1);
		return bLE ? (b2 << 8) + b1 : (b1 << 8) + b2;
	};

	this.getInt16 = function(offset, bLE) {
		return (this.getUint16(offset, bLE) - 65536) % 65536;
	};

	this.getUint32 = function(offset, bLE) {
		return (this.getInt32(offset, bLE) + 4294967296) % 4294967296;
	};

	this.getInt32 = function(offset, bLE) {
		// left shift by 24 (<<) gives signed 32 bit value (Mozilla)
		// TODO: verify for IE?
		var b1 = this.getUint8(offset),
			b2 = this.getUint8(offset + 1),			b3 = this.getUint8(offset + 2),
			b4 = this.getUint8(offset + 3);
		return bLE ? 
			(b4 << 24) + (b3 << 16) + (b2 << 8) + b1 :
			(b1 << 24) + (b2 << 16) + (b3 << 8) + b4;
	};
};
