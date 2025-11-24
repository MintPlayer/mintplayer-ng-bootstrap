import canPromise from './can-promise';
import * as QRCode from './core/qr-code';
import * as CanvasRenderer from './renderer/canvas';
import * as SvgRenderer from './renderer/svg-tag';

export * from './core';

function renderCanvas(
	renderFunc: (d: QRCode.RawQrCodeData, canvas?: HTMLCanvasElement, opts?: any) => any,
	canvas: HTMLCanvasElement | string | any,
	text: string | any,
	opts: any,
	cb?: (err: unknown, value?: any) => void,
) {
	const args = Array.prototype.slice.call(arguments, 1);
	const argsNum = args.length;
	const isLastArgCb = typeof args[argsNum - 1] === 'function';

	if (!isLastArgCb && !canPromise()) {
		throw new Error('Callback required as last argument');
	}

	if (isLastArgCb) {
		if (argsNum < 2) {
			throw new Error('Too few arguments provided');
		}

		if (argsNum === 2) {
			cb = text;
			text = canvas;
			canvas = opts = undefined;
		} else if (argsNum === 3) {
			if ((canvas as HTMLCanvasElement).getContext && typeof cb === 'undefined') {
				cb = opts;
				opts = undefined;
			} else {
				cb = opts;
				opts = text;
				text = canvas;
				canvas = undefined;
			}
		}
	} else {
		if (argsNum < 1) {
			throw new Error('Too few arguments provided');
		}

		if (argsNum === 1) {
			text = canvas;
			canvas = opts = undefined;
		} else if ((argsNum === 2) && !(canvas as HTMLCanvasElement).getContext) {
			opts = text;
			text = canvas;
			canvas = undefined;
		}

		return new Promise((resolve, reject) => {
			try {
				const data = QRCode.create(text, opts);
				resolve(renderFunc(data, canvas, opts));
			} catch (e) {
				reject(e);
			}
		});
	}

	try {
		const data = QRCode.create(text, opts);
		cb?.(null, renderFunc(data, canvas, opts));
	} catch (e) {
		cb?.(e);
	}

	return undefined;
}

export const create = QRCode.create;
export const toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
export const toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
export const toString = renderCanvas.bind(null, (data: QRCode.RawQrCodeData, _c: HTMLCanvasElement | undefined, o: any) => SvgRenderer.render(data, o));
