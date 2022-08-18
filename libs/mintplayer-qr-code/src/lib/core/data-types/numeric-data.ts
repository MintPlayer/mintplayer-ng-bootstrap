import { BitBuffer } from "../bit-buffer";
import * as Mode from '../mode';

export class NumericData {
	constructor(data: string) {
		this.mode = Mode.NUMERIC;
		this.data = data;
	}

	private data: string;
	mode: Mode.Mode;

	public static getBitsLength(length: number) {
		return 10 * Math.floor(length / 3) + ((length % 3) ? ((length % 3) * 3 + 1) : 0);
	}

	public getLength() {
		return this.data.length;
	}

	public getBitsLength() {
		return NumericData.getBitsLength(this.data?.length);
	}

	public write(bitBuffer: BitBuffer) {
		let i: number, group: any, value: number;
		for (i = 0; i + 3 <= this.data.length; i += 3) {
			group = this.data.substr(i, 3);
			value = parseInt(group, 10);
			bitBuffer.put(value, 10);
		}

		const remainingNum = this.data.length - i;
		if (remainingNum > 0) {
			group = this.data.substr(i);
			value = parseInt(group, 10);
			bitBuffer.put(value, remainingNum * 3 + 1);
		}
	}
}