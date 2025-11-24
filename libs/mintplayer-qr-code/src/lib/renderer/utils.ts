import { RawQrCodeData } from '../core/qr-code';

export interface QrCodeColors {
	light?: string;
	dark?: string;
}

export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
	hex?: string;
}

export interface QrCodeOptions {
	color?: QrCodeColors;
	margin?: number;
	width?: number;
	scale?: number;
	type?: 'svg' | 'txt' | 'utf8' | 'png' | 'image/png';
	rendererOpts?: RenderOptions;
	version?: number;
	errorCorrectionLevel?: any;
	maskPattern?: number;
	toSJISFunc?: (codePoint: string) => number | undefined;
}

export interface RenderOptions {
	quality?: number;
	deflateLevel?: number;
	deflateStrategy?: number;
	width?: number;
	height?: number;
}

export interface InternalQrCodeOptions {
	color: {
		light: Rgba;
		dark: Rgba;
	};
	margin: number;
	width?: number;
	scale: number;
	type?: 'svg' | 'txt' | 'utf8' | 'png' | 'image/png';
	rendererOpts: RenderOptions;
}

export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };

function hex2rgba(hex: string | number): Rgba {
	if (typeof hex === 'number') {
		hex = hex.toString();
	}

	if (typeof hex !== 'string') {
		throw new Error('Color should be defined as hex string');
	}

	let hexCode = hex.slice().replace('#', '').split('');
	if ((hexCode.length < 3) || (hexCode.length === 5) || (hexCode.length > 8)) {
		throw new Error('Invalid hex color: ' + hex);
	}

	// Convert from short to long form (fff -> ffffff)
	if ((hexCode.length === 3) || (hexCode.length === 4)) {
		hexCode = Array.prototype.concat.apply([], hexCode.map((c) => [c, c]));
	}

	// Add default alpha value
	if (hexCode.length === 6) hexCode.push('F', 'F');

	const hexValue = parseInt(hexCode.join(''), 16);

	return {
		r: (hexValue >> 24) & 255,
		g: (hexValue >> 16) & 255,
		b: (hexValue >> 8) & 255,
		a: hexValue & 255,
		hex: '#' + hexCode.slice(0, 6).join(''),
	};
}

export function getOptions(options?: Partial<QrCodeOptions>): InternalQrCodeOptions {
	if (!options) options = {};
	if (!options.color) options.color = {};

	const margin = (typeof options.margin === 'undefined') || (options.margin === null) || (options.margin < 0)
		? 4
		: options.margin;

	const width = options.width && options.width >= 21 ? options.width : undefined;
	const scale = options.scale || 4;

	return {
		width,
		scale: width ? 4 : scale,
		margin,
		color: {
			dark: hex2rgba(options.color?.dark || '#000000ff'),
			light: hex2rgba(options.color?.light || '#ffffffff'),
		},
		type: options.type,
		rendererOpts: options.rendererOpts || {},
	};
}

export function getScale(qrSize: number, opts: InternalQrCodeOptions) {
	return opts.width && opts.width >= qrSize + opts.margin * 2
		? opts.width / (qrSize + opts.margin * 2)
		: opts.scale;
}

export function getImageWidth(qrSize: number, opts: InternalQrCodeOptions) {
	const scale = getScale(qrSize, opts);
	return Math.floor((qrSize + opts.margin * 2) * scale);
}

export function qrToImageData(imgData: Uint8ClampedArray | Buffer, qr: RawQrCodeData, opts: InternalQrCodeOptions) {
	const size = qr.modules.size;
	const data = qr.modules.data;
	const scale = getScale(size, opts);
	const symbolSize = Math.floor((size + opts.margin * 2) * scale);
	const scaledMargin = opts.margin * scale;
	const palette = [opts.color.light, opts.color.dark];

	for (let i = 0; i < symbolSize; i++) {
		for (let j = 0; j < symbolSize; j++) {
			let posDst = (i * symbolSize + j) * 4;
			let pxColor = opts.color.light;

			if ((i >= scaledMargin) && (j >= scaledMargin) &&
				(i < symbolSize - scaledMargin) && (j < symbolSize - scaledMargin)) {
				const iSrc = Math.floor((i - scaledMargin) / scale);
				const jSrc = Math.floor((j - scaledMargin) / scale);
				pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
			}

			imgData[posDst++] = pxColor.r;
			imgData[posDst++] = pxColor.g;
			imgData[posDst++] = pxColor.b;
			imgData[posDst] = pxColor.a;
		}
	}
}
