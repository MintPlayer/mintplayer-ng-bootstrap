import { encodeUtf8 } from "@mintplayer/encode-utf8";
import { BitBuffer } from "../bit-buffer";
import * as Mode from '../mode';

export class ByteData {
	constructor(data: string | ArrayBuffer) {
		this.mode = Mode.BYTE;
		if (typeof data === 'string') {
			data = encodeUtf8(data)
		}
		this.data = new Uint8Array(data);
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