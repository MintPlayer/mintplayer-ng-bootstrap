import { RawQrCodeData } from '../core/qr-code';
import * as big from './terminal/terminal';
import * as small from './terminal/terminal-small';

export function render(qrData: RawQrCodeData, options?: any, cb?: (err: any, data?: string) => void) {
	if (options && options.small) {
		return small.render(qrData, options, cb);
	}
	return big.render(qrData, options, cb);
}
