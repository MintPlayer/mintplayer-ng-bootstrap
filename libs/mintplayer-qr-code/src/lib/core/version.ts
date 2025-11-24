import { AlphanumericData } from "./data-types/alphanumeric-data";
import { ByteData } from "./data-types/byte-data";
import { KanjiData } from "./data-types/kanji-data";
import { NumericData } from "./data-types/numeric-data";
import { ErrorCorrectionLevel } from "./error-correction-level";
import * as Utils from "./utils";
import * as ECCode from "./error-correction-code";
import * as ECLevel from "./error-correction-level";
import * as Mode from "./mode";
import * as VersionCheck from './version-check';

// Generator polynomial used to encode version information
const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
const G18_BCH = Utils.getBCHDigit(G18);

export function getBestVersionForDataLength(mode: Mode.Mode, length: number, errorCorrectionLevel: ErrorCorrectionLevel) {
	for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
		if (length <= getCapacity(currentVersion, errorCorrectionLevel, mode)) {
			return currentVersion;
		}
	}
	
	return undefined;
}

export function getReservedBitsCount(mode: Mode.Mode, version: number) {
	// Character count indicator + mode indicator bits
	return Mode.getCharCountIndicator(mode, version) + 4
}

export function getTotalBitsFromDataArray(segments: (NumericData | ByteData | AlphanumericData | KanjiData)[], version: number) {
	let totalBits = 0;
  
	segments.forEach((data) => {
		const reservedBits = getReservedBitsCount(data.mode, version);
		totalBits += reservedBits + data.getBitsLength();
	});
  
	return totalBits;
}

export function getBestVersionForMixedData(segments: (NumericData | ByteData | AlphanumericData | KanjiData)[], errorCorrectionLevel: ErrorCorrectionLevel) {
	for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
		const length = getTotalBitsFromDataArray(segments, currentVersion);
		if (length <= getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
			return currentVersion;
		}
	}
  
	return undefined;
}

export function from(value?: number, defaultValue?: number) {
	if (VersionCheck.isValid(value)) {
		return parseInt(value as any, 10);
	}
  
	return defaultValue;
}

export function isValid(version: number | undefined) {
	return VersionCheck.isValid(version);
}

export function getCapacity(version: number, errorCorrectionLevel: ErrorCorrectionLevel, mode: Mode.Mode) {
	if (!VersionCheck.isValid(version)) {
		throw new Error('Invalid QR Code version');
	}
  
	// Use Byte mode as default
	if (typeof mode === 'undefined') {
		mode = Mode.BYTE;
	}
  
	// Total codewords for this QR code version (Data + Error correction)
	const totalCodewords = Utils.getSymbolTotalCodewords(version);
  
	// Total number of error correction codewords
	const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
  
	// Total number of data codewords
	const dataTotalCodewordsBits = (totalCodewords - (ecTotalCodewords ?? 0)) * 8;
  
	if (mode === Mode.MIXED) {
		return dataTotalCodewordsBits;
	}
  
	const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
  
	// Return max number of storable codewords
	switch (mode) {
		case Mode.NUMERIC:
			return Math.floor((usableBits / 10) * 3);
		case Mode.ALPHANUMERIC:
			return Math.floor((usableBits / 11) * 2);
		case Mode.KANJI:
			return Math.floor(usableBits / 13);
		case Mode.BYTE:
		default:
			return Math.floor(usableBits / 8);
	}
}

export function getBestVersionForData(data: (NumericData | ByteData | AlphanumericData | KanjiData)[], errorCorrectionLevel: ErrorCorrectionLevel) {
	let seg;
  
	const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
  
	if (Array.isArray(data)) {
		if (data.length > 1) {
			return getBestVersionForMixedData(data, ecl);
		}
  
		if (data.length === 0) {
			return 1;
		}
  
		seg = data[0];
	} else {
		seg = data;
	}
  
	return getBestVersionForDataLength(seg.mode, seg.getLength() ?? 0, ecl);
}

export function getEncodedBits(version: number) {
	if (!VersionCheck.isValid(version) || (version < 7)) {
		throw new Error('Invalid QR Code version');
	}
  
	let d = version << 12;
  
	while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
		d ^= (G18 << (Utils.getBCHDigit(d) - G18_BCH));
	}
  
	return (version << 12) | d;
}
