import { ErrorCorrectionLevel } from "../core/error-correction-level";
import { RawQrCodeData } from "../core/qr-code";

function hex2rgba(hex: string | number) {
	if (typeof hex === 'number') {
		hex = hex.toString();
	}

	if (typeof hex !== 'string') {
		return null;
	}

	let hexCode = hex.slice().replace('#', '').split('');
	if ((hexCode.length < 3) || (hexCode.length === 5) || (hexCode.length > 8)) {
		return null;
	}

	// Convert from short to long form (fff -> ffffff)
	if ((hexCode.length === 3) || (hexCode.length === 4)) {
		hexCode = Array.prototype.concat.apply([], hexCode.map((c) => {
			return [c, c];
		}));
	}

	// Add default alpha value
	if (hexCode.length === 6) hexCode.push('F', 'F');

	const hexValue = parseInt(hexCode.join(''), 16);

	return <Rgba>{
		r: (hexValue >> 24) & 255,
		g: (hexValue >> 16) & 255,
		b: (hexValue >> 8) & 255,
		a: hexValue & 255,
		hex: '#' + hexCode.slice(0, 6).join(''),
	};
}

export interface QrCodeOptions {
	color?: QrCodeColors;
	margin?: number;
	width?: number;
	// height: number;
	scale?: number;
	type?: 'svg' | 'txt' | 'utf8' | 'png' | 'image/png';

	version?: number;
	errorCorrectionLevel?: ErrorCorrectionLevel | string;
	maskPattern?: number;
	toSJISFunc?: (codePoint: string) => number | undefined;

	rendererOpts?: RenderOptions;
}

export interface InternalQrCodeOptions {
	color?: {
		light?: Rgba,
		dark?: Rgba
	};
	margin?: number;
	width?: number;
	// height: number;
	scale?: number;
	type?: 'svg' | 'txt' | 'utf8' | 'png' | 'image/png';

	version?: number;
	errorCorrectionLevel?: ErrorCorrectionLevel | string;
	// maskPattern?: number;
	toSJISFunc?: (codePoint: string) => number | undefined;

	rendererOpts?: RenderOptions;
}

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

export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };

export interface RenderOptions {
	quality?: number;
	deflateLevel?: number;
	deflateStrategy?: number;
}

export function getOptions(options?: Partial<QrCodeOptions>) {
	if (!options) {
		options = {};
	}
	if (!options.color) {
		options.color = {};
	}

	const margin = (typeof options.margin === 'undefined') || (options.margin === null) || (options.margin < 0)
		? 4 : options.margin;

	const width = options.width && options.width >= 21 ? options.width : undefined;
	const scale = options.scale || 4;

	return <InternalQrCodeOptions>{
		width: width,
		scale: width ? 4 : scale,
		margin: margin,
		color: {
			dark: hex2rgba(options.color?.dark || '#000000ff'),
			light: hex2rgba(options.color.light || '#ffffffff'),
		},
		type: options.type,
		rendererOpts: options.rendererOpts || { deflateLevel: 0, quality: 0, deflateStrategy: 0 },
	};
}

export function getScale(qrSize: number, opts: Partial<InternalQrCodeOptions>) {
	return opts.width && opts.width >= qrSize + (opts.margin ?? 0) * 2
		? opts.width / (qrSize + (opts.margin ?? 0) * 2)
		: opts.scale;
}

export function getImageWidth(qrSize: number, opts: Partial<InternalQrCodeOptions>) {
	const scale = getScale(qrSize, opts) ?? 1;
	return Math.floor((qrSize + (opts.margin ?? 0) * 2) * scale);
}

export function qrToImageData(imgData: Uint8ClampedArray, qr: RawQrCodeData, opts: Partial<InternalQrCodeOptions>) {
	const size = qr.modules.size;
	const data = qr.modules.data;
	const scale = getScale(size, opts) ?? 1;
	const symbolSize = Math.floor((size + (opts.margin ?? 0) * 2) * scale);
	const scaledMargin = (opts.margin ?? 0) * scale;
	const palette = [opts?.color?.light ?? WHITE, opts?.color?.dark ?? BLACK];

	for (let i = 0; i < symbolSize; i++) {
		for (let j = 0; j < symbolSize; j++) {
			const posDst = (i * symbolSize + j) * 4;
			let pxColor = opts?.color?.light ?? WHITE;

			if ((scaledMargin <= i) && (i < symbolSize - scaledMargin) &&
			    (scaledMargin <= j) && (j < symbolSize - scaledMargin)) {
				const iSrc = Math.floor((i - scaledMargin) / scale);
				const jSrc = Math.floor((j - scaledMargin) / scale);
				pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
			}

			imgData.set([pxColor.r, pxColor.g, pxColor.b, pxColor.a], posDst);
		}
	}
}
