import * as Mode from '../mode';
import { BitBuffer } from "../bit-buffer";
import { toSJIS } from "../utils";

export class KanjiData {
	constructor(data: string) {
		this.mode = Mode.KANJI;
		this.data = data;
	}

	private data: string | null;
	mode: Mode.Mode;

	public static getBitsLength(length: number) {
		return length * 13;
	}

	public getLength() {
		return this.data?.length;
	}

	public getBitsLength() {
		if (this.data) {
			return KanjiData.getBitsLength(this.data.length);
		} else {
			return 0;
		}
	}

	public write(bitBuffer: BitBuffer) {
		let i: number;
		
		if (this.data) {
			// In the Shift JIS system, Kanji characters are represented by a two byte combination.
			// These byte values are shifted from the JIS X 0208 values.
			// JIS X 0208 gives details of the shift coded representation.
			for (i = 0; i < this.data.length; i++) {
				let value = toSJIS(this.data[i]);
				
				if (!value) {
					throw new Error('Value undefined');
				} else if (value >= 0x8140 && value <= 0x9FFC) {
					// For characters with Shift JIS values from 0x8140 to 0x9FFC:
					// Subtract 0x8140 from Shift JIS value
					value -= 0x8140;
					
				} else if (value >= 0xE040 && value <= 0xEBBF) {
					// For characters with Shift JIS values from 0xE040 to 0xEBBF
					// Subtract 0xC140 from Shift JIS value
					value -= 0xC140;
				} else {
					throw new Error(
						'Invalid SJIS character: ' + this.data[i] + '\n' +
						'Make sure your charset is UTF-8');
				}
				
				// Multiply most significant byte of result by 0xC0
				// and add least significant byte to product
				value = (((value >>> 8) & 0xff) * 0xC0) + (value & 0xff);
				
				// Convert result to a 13-bit binary string
				bitBuffer.put(value, 13);
			}
		}
	}
}