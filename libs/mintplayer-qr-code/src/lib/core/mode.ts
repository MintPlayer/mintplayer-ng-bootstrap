import * as Regex from './regex';
import * as VersionCheck from './version';

export interface Mode {
	id?: string;
	bit: number;
	ccBits?: number[];
}

export const NUMERIC: Mode = {
	id: 'Numeric',
	bit: 1 << 0,
	ccBits: [10, 12, 14],
};

export const ALPHANUMERIC: Mode = {
	id: 'Alphanumeric',
	bit: 1 << 1,
	ccBits: [9, 11, 13],
};

export const BYTE: Mode = {
	id: 'Byte',
	bit: 1 << 2,
	ccBits: [8, 16, 16],
};

export const KANJI: Mode = {
	id: 'Kanji',
	bit: 1 << 3,
	ccBits: [8, 10, 12],
};

export const MIXED: Mode = {
	bit: -1
};

export function getCharCountIndicator(mode: Mode, version: number) {
	if (!mode.ccBits) throw new Error('Invalid mode: ' + mode);
  
	if (!VersionCheck.isValid(version)) {
		throw new Error('Invalid version: ' + version);
	}
  
	if (version >= 1 && version < 10) return mode.ccBits[0];
	else if (version < 27) return mode.ccBits[1];
	else return mode.ccBits[2];
}

export function getBestModeForData(data: string) {
	if (Regex.testNumeric(data)) return NUMERIC;
	else if (Regex.testAlphanumeric(data)) return ALPHANUMERIC;
	else if (Regex.testKanji(data)) return KANJI;
	else return BYTE;
}

export function toString(mode: Mode) {
	if (mode && mode.id) {
		return mode.id;
	} else {
		throw new Error('Invalid mode');
	}
}

export function isValid(mode: Mode) {
	return mode && mode.bit && mode.ccBits;
}

export function fromString(str: string) {
	if (typeof str !== 'string') {
		throw new Error('Param is not a string')
	}
  
	const lcStr = str.toLowerCase()
  
	switch (lcStr) {
		case 'numeric':
			return NUMERIC;
		case 'alphanumeric':
			return ALPHANUMERIC;
		case 'kanji':
			return KANJI;
		case 'byte':
			return BYTE;
		default:
			throw new Error(`Unknown mode: ${str}`);
	}
}

export function from(value: Mode | string | null, defaultValue: Mode): Mode {
	if (!value) {
		return defaultValue;
	} else if (typeof value === 'string') {
		try {
			return fromString(value);
		} catch (e) {
			return defaultValue;
		}
	} else {
		if (isValid(value)) {
			return value;
		} else {
			return defaultValue;
		}
	}
}