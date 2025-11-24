import * as fs from 'fs';
import { RawQrCodeData } from '../core/qr-code';
import * as svgTagRenderer from './svg-tag';

export const render = svgTagRenderer.render;

export function renderToFile(path: string, qrData: RawQrCodeData, options?: any, cb?: (err?: any) => void) {
	let opts = options;
	let callback = cb;

	if (typeof callback === 'undefined') {
		callback = opts;
		opts = undefined;
	}

	const svgTag = render(qrData, opts);

	const xmlStr = '<?xml version="1.0" encoding="utf-8"?>' +
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
    svgTag;

	fs.writeFile(path, xmlStr, callback as any);
}
