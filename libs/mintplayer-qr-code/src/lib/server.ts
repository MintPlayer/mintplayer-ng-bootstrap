import canPromise from './can-promise';
import * as QRCode from './core/qr-code';
import * as PngRenderer from './renderer/png';
import * as Utf8Renderer from './renderer/utf8';
import * as TerminalRenderer from './renderer/terminal';
import * as SvgRenderer from './renderer/svg';

export * from './browser';

function checkParams(text: string, opts?: any, cb?: any) {
	if (typeof text === 'undefined') {
		throw new Error('String required as first argument');
	}

	if (typeof cb === 'undefined') {
		cb = opts;
		opts = {};
	}

	if (typeof cb !== 'function') {
		if (!canPromise()) {
			throw new Error('Callback required as last argument');
		} else {
			opts = cb || {};
			cb = null;
		}
	}

	return {
		opts,
		cb,
	};
}

function getTypeFromFilename(path: string) {
	return path.slice(((path.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

function getRendererFromType(type?: string) {
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

function getStringRendererFromType(type?: string) {
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

function render(renderFunc: any, text: any, params: { opts: any; cb?: any; }) {
	if (!params.cb) {
		return new Promise((resolve, reject) => {
			try {
				const data = QRCode.create(text, params.opts);
				return renderFunc(data, params.opts, (err: any, res: any) => (err ? reject(err) : resolve(res)));
			} catch (e) {
				reject(e);
			}
		});
	}

	try {
		const data = QRCode.create(text, params.opts);
		return renderFunc(data, params.opts, params.cb);
	} catch (e) {
		params.cb(e);
		return undefined;
	}
}

export const create = QRCode.create;

export { toCanvas } from './browser';

export function toString(text: any, opts?: any, cb?: any) {
	const params = checkParams(text, opts, cb);
	const type = params.opts ? params.opts.type : undefined;
	const renderer = getStringRendererFromType(type);
	return render(renderer.render, text, params);
}

export function toDataURL(text: any, opts?: any, cb?: any) {
	const params = checkParams(text, opts, cb);
	const renderer = getRendererFromType(params.opts.type) as any;
	return render(renderer.renderToDataURL, text, params);
}

export function toBuffer(text: any, opts?: any, cb?: any) {
	const params = checkParams(text, opts, cb);
	const renderer = getRendererFromType(params.opts.type) as any;
	return render(renderer.renderToBuffer, text, params);
}

export function toFile(path: string, text: any, opts?: any, cb?: any) {
	if ((typeof path !== 'string') || !((typeof text === 'string') || (typeof text === 'object'))) {
		throw new Error('Invalid argument');
	}

	if ((arguments.length < 3) && !canPromise()) {
		throw new Error('Too few arguments provided');
	}

	const params = checkParams(text as string, opts, cb);
	const type = params.opts.type || getTypeFromFilename(path);
	const renderer = getRendererFromType(type) as any;
	const renderToFile = renderer.renderToFile.bind(null, path);

	return render(renderToFile, text as string, params);
}

export function toFileStream(stream: NodeJS.WritableStream, text: any, opts?: any) {
	if (arguments.length < 2) {
		throw new Error('Too few arguments provided');
	}

	const params = checkParams(text, opts, stream.emit.bind(stream, 'error'));
	const renderer = getRendererFromType('png') as any; // Only png support for now
	const renderToFileStream = renderer.renderToFileStream.bind(null, stream);
	render(renderToFileStream, text, params);
}
