import * as fs from 'fs';
import { PNG } from 'pngjs';
import { RawQrCodeData } from '../core/qr-code';
import * as Utils from './utils';

export function render(qrData: RawQrCodeData, options?: any) {
	const opts = Utils.getOptions(options);
	const pngOpts = opts.rendererOpts;
	const size = Utils.getImageWidth(qrData.modules.size, opts);

	pngOpts.width = size;
	pngOpts.height = size;

	const pngImage = new PNG(pngOpts);
	Utils.qrToImageData(pngImage.data as unknown as Uint8ClampedArray, qrData, opts);

	return pngImage;
}

export function renderToDataURL(qrData: RawQrCodeData, options: any, cb: (err: any, data?: any) => void) {
	let opts = options;
	let callback = cb;

	if (typeof callback === 'undefined') {
		callback = opts;
		opts = undefined;
	}

	renderToBuffer(qrData, opts, (err, output) => {
		if (err) {
			callback(err);
			return;
		}
		let url = 'data:image/png;base64,';
		url += output!.toString('base64');
		callback(null, url);
	});
}

export function renderToBuffer(qrData: RawQrCodeData, options: any, cb: (err: any, data?: Buffer) => void) {
	let opts = options;
	let callback = cb;

	if (typeof callback === 'undefined') {
		callback = opts;
		opts = undefined;
	}

	const png = render(qrData, opts);
	const buffer: Buffer[] = [];

	png.on('error', callback);

	png.on('data', (data: Buffer) => {
		buffer.push(data);
	});

	png.on('end', () => {
		callback(null, Buffer.concat(buffer));
	});

	png.pack();
}

export function renderToFile(path: string, qrData: RawQrCodeData, options: any, cb: (err?: any) => void) {
	let opts = options;
	let callback = cb;

	if (typeof callback === 'undefined') {
		callback = opts;
		opts = undefined;
	}

	let called = false;
	const done = (...args: any[]) => {
		if (called) return;
		called = true;
		callback.apply(null, args as unknown as []);
	};

	const stream = fs.createWriteStream(path);

	stream.on('error', done);
	stream.on('close', done);

	renderToFileStream(stream, qrData, opts);
}

export function renderToFileStream(stream: NodeJS.WritableStream, qrData: RawQrCodeData, options?: any) {
	const png = render(qrData, options);
	png.pack().pipe(stream as any);
}
