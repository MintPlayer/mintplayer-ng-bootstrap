import canPromise from './can-promise';
import * as QRCode from './core/qr-code';
import * as PngRenderer from './renderer/png';
import * as Utf8Renderer from './renderer/utf8';
import * as TerminalRenderer from './renderer/terminal';
import * as SvgRenderer from './renderer/svg';
import { QrCodeOptions } from './renderer/utils';

type RenderCallback<T = unknown> = (err: unknown, data?: T) => void;
type RenderFunction<T = unknown> = (
	qrData: QRCode.RawQrCodeData,
	options: Partial<QrCodeOptions>,
	cb: RenderCallback<T>
) => unknown;
type RenderParams<T = unknown> = { opts: Partial<QrCodeOptions>; cb: RenderCallback<T> | null };

export * from './browser';

function checkParams<T = unknown>(
	text: string,
	opts?: Partial<QrCodeOptions> | RenderCallback<T> | null,
	cb?: RenderCallback<T> | null
): RenderParams<T> {
	if (typeof text === 'undefined') {
		throw new Error('String required as first argument');
	}

	let options: Partial<QrCodeOptions> = {};
	let callback: RenderCallback<T> | null = null;

	if (typeof cb === 'undefined') {
		if (typeof opts === 'function') {
			callback = opts as RenderCallback<T>;
		} else {
			options = opts ?? {};
			if (!canPromise()) {
				throw new Error('Callback required as last argument');
			}
		}
	} else if (typeof cb === 'function') {
		options = (opts as Partial<QrCodeOptions>) ?? {};
		callback = cb;
	} else {
		if (!canPromise()) {
			throw new Error('Callback required as last argument');
		}
		options = (cb as unknown as Partial<QrCodeOptions>) || {};
		callback = null;
	}

	return {
		opts: options,
		cb: callback,
	};
}

function getTypeFromFilename(path: string) {
	return path.slice(((path.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

function getRendererFromType(type?: string): typeof PngRenderer | typeof Utf8Renderer | typeof SvgRenderer {
	switch (type) {
		case 'svg':
			return SvgRenderer;
		case 'txt':
		case 'utf8':
			return Utf8Renderer;
		case 'png':
		case 'image/png':
		default:
			return PngRenderer;
	}
}

function getStringRendererFromType(type?: string): typeof Utf8Renderer | typeof SvgRenderer | typeof TerminalRenderer {
	switch (type) {
		case 'svg':
			return SvgRenderer;
		case 'terminal':
			return TerminalRenderer;
		case 'utf8':
		default:
			return Utf8Renderer;
	}
}

function render<T>(renderFunc: RenderFunction<T>, text: string, params: RenderParams<T>): Promise<T> | unknown {
	if (!params.cb) {
		return new Promise((resolve, reject) => {
			try {
				const data = QRCode.create(text, params.opts);
				return renderFunc(data, params.opts, (err, res) => (err ? reject(err) : resolve(res as T)));
			} catch (e) {
				reject(e);
				return;
			}
		});
	}

	try {
		const data = QRCode.create(text, params.opts);
		return renderFunc(data, params.opts, params.cb);
	} catch (e) {
		params.cb(e);
	}

	return undefined;
}

export const create = QRCode.create;

export { toCanvas } from './browser';

export function toString(text: string, opts?: Partial<QrCodeOptions>, cb?: RenderCallback<string>) {
	const params = checkParams<string>(text, opts, cb);
	const type = params.opts ? params.opts.type : undefined;
	const renderer = getStringRendererFromType(type) as { render: RenderFunction<string> };
	return render(renderer.render, text, params);
}

export function toDataURL(text: string, opts?: Partial<QrCodeOptions>, cb?: RenderCallback<string>) {
	const params = checkParams<string>(text, opts, cb);
	const renderer = getRendererFromType(params.opts.type) as { renderToDataURL: RenderFunction<string> };
	return render(renderer.renderToDataURL, text, params);
}

export function toBuffer(text: string, opts?: Partial<QrCodeOptions>, cb?: RenderCallback<Buffer>) {
	const params = checkParams<Buffer>(text, opts, cb);
	const renderer = getRendererFromType(params.opts.type) as { renderToBuffer: RenderFunction<Buffer> };
	return render(renderer.renderToBuffer, text, params);
}

export function toFile(path: string, text: string, ...rest: [Partial<QrCodeOptions>?, RenderCallback<void>?]) {
	if ((typeof path !== 'string') || (typeof text !== 'string')) {
		throw new Error('Invalid argument');
	}

	if ((2 + rest.length < 3) && !canPromise()) {
		throw new Error('Too few arguments provided');
	}

	const [opts, cb] = rest;
	const params = checkParams<void>(text, opts, cb);
	const type = params.opts.type || getTypeFromFilename(path);
	const renderer = getRendererFromType(type) as unknown as {
		renderToFile: (path: string, qrData: QRCode.RawQrCodeData, options?: Partial<QrCodeOptions>, cb?: RenderCallback<void>) => void;
	};
	const renderToFile = (renderer.renderToFile as unknown as (path: string, qrData: QRCode.RawQrCodeData, options?: Partial<QrCodeOptions>, cb?: RenderCallback<void>) => void)
		.bind(null, path) as RenderFunction<void>;

	return render(renderToFile, text as string, params);
}

export function toFileStream(stream: NodeJS.WritableStream, text: string, ...rest: [Partial<QrCodeOptions>?]) {
	const [opts] = rest;
	const params = checkParams<void>(text, opts, stream.emit.bind(stream, 'error'));
	const renderer = getRendererFromType('png') as unknown as {
		renderToFileStream: (stream: NodeJS.WritableStream, qrData: QRCode.RawQrCodeData, options?: Partial<QrCodeOptions>, cb?: RenderCallback<void>) => void;
	}; // Only png support for now
	const renderToFileStream = (renderer.renderToFileStream as unknown as (stream: NodeJS.WritableStream, qrData: QRCode.RawQrCodeData, options?: Partial<QrCodeOptions>, cb?: RenderCallback<void>) => void)
		.bind(null, stream) as RenderFunction<void>;
	render(renderToFileStream, text, params);
}
