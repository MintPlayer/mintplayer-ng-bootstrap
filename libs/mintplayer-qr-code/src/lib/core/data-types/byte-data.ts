import { BitBuffer } from "../bit-buffer";
import * as Mode from '../mode';

export class ByteData {
	constructor(data: string | ArrayBuffer) {
		this.mode = Mode.BYTE;
		// UTF-8 via the platform TextEncoder (every browser and Node). It replaced the
		// former @mintplayer/encode-utf8, after a spec proved the two byte-identical over
		// every code unit and surrogate pair; data-types.spec.ts pins the encoding.
		this.data = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
	}

	private data: Uint8Array;
	mode: Mode.Mode;

	public static getBitsLength(length: number) {
		return length * 8;
	}

	public getLength() {
		return this.data.length;
	}

	public getBitsLength() {
		return ByteData.getBitsLength(this.data.length);
	}

	public write(bitBuffer: BitBuffer) {
		for (let i = 0, l = this.data.length; i < l; i++) {
			bitBuffer.put(this.data[i], 8);
		}
	}

}