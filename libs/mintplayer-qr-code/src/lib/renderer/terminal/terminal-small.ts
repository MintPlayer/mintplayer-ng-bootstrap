import { RawQrCodeData } from '../../core/qr-code';

const backgroundWhite = '\x1b[47m';
const backgroundBlack = '\x1b[40m';
const foregroundWhite = '\x1b[37m';
const foregroundBlack = '\x1b[30m';
const reset = '\x1b[0m';
const lineSetupNormal = backgroundWhite + foregroundBlack;
const lineSetupInverse = backgroundBlack + foregroundWhite;

const createPalette = function (lineSetup: string, fgWhite: string, fgBlack: string) {
	return {
		'00': reset + ' ' + lineSetup,
		'01': reset + fgWhite + '▄' + lineSetup,
		'02': reset + fgBlack + '▄' + lineSetup,
		10: reset + fgWhite + '▀' + lineSetup,
		11: ' ',
		12: '▄',
		20: reset + fgBlack + '▀' + lineSetup,
		21: '▀',
		22: '█',
	};
};

const mkCodePixel = function (modules: ArrayLike<number | boolean>, size: number, x: number, y: number): string {
	const sizePlus = size + 1;
	if ((x >= sizePlus) || (y >= sizePlus) || (y < -1) || (x < -1)) return '0';
	if ((x >= size) || (y >= size) || (y < 0) || (x < 0)) return '1';
	const idx = (y * size) + x;
	return modules[idx] ? '2' : '1';
};

const mkCode = function (modules: ArrayLike<number | boolean>, size: number, x: number, y: number) {
	return (
		mkCodePixel(modules, size, x, y) +
    mkCodePixel(modules, size, x, y + 1)
	) as keyof ReturnType<typeof createPalette>;
};

export function render(qrData: RawQrCodeData, options?: any, cb?: (err: any, data?: string) => void) {
	const size = qrData.modules.size;
	const data = qrData.modules.data;

	const inverse = !!(options && options.inverse);
	const lineSetup = options && options.inverse ? lineSetupInverse : lineSetupNormal;
	const white = inverse ? foregroundBlack : foregroundWhite;
	const black = inverse ? foregroundWhite : foregroundBlack;

	const palette = createPalette(lineSetup, white, black);
	const newLine = reset + '\n' + lineSetup;

	let output = lineSetup;

	for (let y = -1; y < size + 1; y += 2) {
		for (let x = -1; x < size; x++) {
			output += palette[mkCode(data, size, x, y)];
		}

		output += palette[mkCode(data, size, size, y)] + newLine;
	}

	output += reset;

	if (typeof cb === 'function') {
		cb(null, output);
	}

	return output;
}
