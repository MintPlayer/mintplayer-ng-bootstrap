import { BitBuffer } from "../bit-buffer";
import * as Mode from '../mode';

export class ByteData {
	constructor(data: string | ArrayBuffer) {
		this.mode = Mode.BYTE;
		// TextEncoder is byte-for-byte what @mintplayer/encode-utf8 produced (proved
		// exhaustively in that lib's spec), and it exists in every browser and in Node.
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