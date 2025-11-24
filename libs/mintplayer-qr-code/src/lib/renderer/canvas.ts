import { RawQrCodeData } from '../core/qr-code';
import * as Utils from './utils';

function clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, size: number) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (!canvas.style) {
		(canvas as any).style = {};
	}

	canvas.height = size;
	canvas.width = size;
	canvas.style.height = `${size}px`;
	canvas.style.width = `${size}px`;
}

function getCanvasElement() {
	try {
		return document.createElement('canvas');
	} catch (e) {
		throw new Error('You need to specify a canvas element');
	}
}

export function render(qrData: RawQrCodeData, canvas?: HTMLCanvasElement, options?: any) {
	let opts = options;
	let canvasEl = canvas;

	if ((typeof opts === 'undefined') && (!canvas || !(canvas as HTMLCanvasElement).getContext)) {
		opts = canvas;
		canvas = undefined as any;
	}

	if (!canvas) {
		canvasEl = getCanvasElement();
	}

	opts = Utils.getOptions(opts);
	const size = Utils.getImageWidth(qrData.modules.size, opts);

	const ctx = canvasEl!.getContext('2d')!;
	const image = ctx.createImageData(size, size);
	Utils.qrToImageData(image.data, qrData, opts);

	clearCanvas(ctx, canvasEl!, size);
	ctx.putImageData(image, 0, 0);

	return canvasEl;
}

export function renderToDataURL(qrData: RawQrCodeData, canvas?: HTMLCanvasElement, options?: any) {
	let opts = options;

	if ((typeof opts === 'undefined') && (!canvas || !(canvas as HTMLCanvasElement).getContext)) {
		opts = canvas;
		canvas = undefined as any;
	}

	if (!opts) opts = {};

	const canvasEl = render(qrData, canvas, opts);

	const type = opts.type || 'image/png';
	const rendererOpts = opts.rendererOpts || {};

	return (canvasEl as HTMLCanvasElement).toDataURL(type, rendererOpts.quality);
}
