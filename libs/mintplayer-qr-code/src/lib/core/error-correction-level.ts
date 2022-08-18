export interface ErrorCorrectionLevel {
	bit: number;
}

export type QRCodeErrorCorrectionLevel = 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';

export const L: ErrorCorrectionLevel = { bit: 1 };
export const M: ErrorCorrectionLevel = { bit: 0 };
export const Q: ErrorCorrectionLevel = { bit: 3 };
export const H: ErrorCorrectionLevel = { bit: 2 };

export function fromString(str: string): ErrorCorrectionLevel {
	const lcString = str.toLowerCase();
	switch (lcString) {
		case 'l':
		case 'low':
			return L;
		case 'm':
		case 'medium':
			return M;
		case 'q':
		case 'quartile':
			return Q;
		case 'h':
		case 'high':
			return H;
		default:
			throw new Error(`Unknown EC level: ${str}`);
	}
}

export function isValid (level: ErrorCorrectionLevel): boolean {
	return (level)
		&& (typeof level.bit !== 'undefined')
		&& (level.bit < 4);
}

export function from (value: ErrorCorrectionLevel | string, defaultValue: ErrorCorrectionLevel): ErrorCorrectionLevel {
	if (typeof value === 'string') {
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