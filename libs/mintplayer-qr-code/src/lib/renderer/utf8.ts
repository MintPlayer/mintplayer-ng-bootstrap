import * as fs from 'fs';
import { RawQrCodeData } from '../core/qr-code';
import * as Utils from './utils';

const BLOCK_CHAR = {
	WW: ' ',
	WB: '▄',
	BB: '█',
	BW: '▀',
};

const INVERTED_BLOCK_CHAR = {
	BB: ' ',
	BW: '▄',
	WW: '█',
	WB: '▀',
};

function getBlockChar(top: boolean | number, bottom: boolean | number, blocks: typeof BLOCK_CHAR) {
	if (!!top && !!bottom) return blocks.BB;
	if (!!top && !bottom) return blocks.BW;
	if (!top && !!bottom) return blocks.WB;
	return blocks.WW;
}

export function render(qrData: RawQrCodeData, options?: any, cb?: (err: any, data?: string) => void) {
	const opts = Utils.getOptions(options);
	let blocks = BLOCK_CHAR;
	if ((opts.color.dark.hex === '#ffffff') || (opts.color.light.hex === '#000000')) {
		blocks = INVERTED_BLOCK_CHAR;
	}

	const size = qrData.modules.size;
	const data = qrData.modules.data;

	let output = '';
	let hMargin = Array(size + (opts.margin * 2) + 1).join(blocks.WW);
	hMargin = Array((opts.margin / 2) + 1).join(hMargin + '\n');

	const vMargin = Array(opts.margin + 1).join(blocks.WW);

	output += hMargin;
	for (let i = 0; i < size; i += 2) {
		output += vMargin;
		for (let j = 0; j < size; j++) {
			const topModule = data[i * size + j];
			const bottomModule = data[(i + 1) * size + j];

			output += getBlockChar(topModule, bottomModule, blocks);
		}

		output += vMargin + '\n';
	}

	output += hMargin.slice(0, -1);

	if (typeof cb === 'function') {
		cb(null, output);
	}

	return output;
}

export function renderToFile(path: string, qrData: RawQrCodeData, options?: any, cb?: (err?: any) => void) {
	let opts = options;
	let callback = cb;

	if (typeof callback === 'undefined') {
		callback = opts;
		opts = undefined;
	}

	const utf8 = render(qrData, opts);
	fs.writeFile(path, utf8, callback as any);
}
