import { BitBuffer } from "../bit-buffer";
import * as Mode from '../mode';

const ALPHA_NUM_CHARS = [
	'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
	'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
	'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
	' ', '$', '%', '*', '+', '-', '.', '/', ':'
]

export class AlphanumericData {
	constructor(data: string) {
		this.mode = Mode.ALPHANUMERIC;
		this.data = data;
	}
	
	private data: string;
	mode: Mode.Mode;
	
	public static getBitsLength(length: number) {
		return 11 * Math.floor(length / 2) + 6 * (length % 2);
	}

	public getLength() {
		return this.data.length;
	}

	public getBitsLength() {
		return AlphanumericData.getBitsLength(this.data?.length);
	}

	public write(bitBuffer: BitBuffer) {
		let i: number;
		for (i = 0; i + 2 <= this.data.length; i += 2) {
			let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
			value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
			bitBuffer.put(value, 11);
		}

		if (this.data.length % 2) {
			bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
		}
	}
}