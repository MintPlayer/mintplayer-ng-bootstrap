import { RawQrCodeData } from '../core/qr-code';
import * as Utils from './utils';

export function render(qrData: RawQrCodeData, canvas: HTMLCanvasElement, options: Utils.QrCodeOptions) {
	if (typeof window !== 'undefined') {
		// Convert hex-coded colors to Rgba interface
		const opts = Utils.getOptions(options);
		const size = Utils.getImageWidth(qrData.modules.size, opts);
		const ctx = canvas.getContext('2d');
		const image = ctx?.createImageData(size, size);
		if (image && ctx) {
			Utils.qrToImageData(image.data ?? [], qrData, opts);
			clearCanvas(ctx, canvas, size);
			ctx?.putImageData(image, 0, 0);
		}
	}
}

function clearCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, size: number) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// if (!canvas.style) {
	// 	canvas.style = {};
	// }

	canvas.height = canvas.width = size;
	canvas.style.height = canvas.style.width = `${size}px`;
}