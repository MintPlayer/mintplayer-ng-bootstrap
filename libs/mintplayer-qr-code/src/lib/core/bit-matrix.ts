export class BitMatrix {
	public data: Uint8Array;
	public reservedBit: Uint8Array;

	constructor(public size: number) {
		if (!size || size < 1) {
			throw new Error('BitMatrix size must be defined and greater than 0');
		}

		this.data = new Uint8Array(size * size);
		this.reservedBit = new Uint8Array(size * size);
	}

	public set(row: number, col: number, value: boolean, reserved: boolean) {
		const index = row * this.size + col;
		this.data[index] = value ? 1 : 0;
		if (reserved) {
			this.reservedBit[index] = 1;
		}
	}

	public get(row: number, col: number) {
		return this.data[row * this.size + col] ? 1 : 0;
	}

	public xor(row: number, col: number, value: boolean) {
		this.data[row * this.size + col] ^= value ? 1 : 0;
	}

	public isReserved(row: number, col: number) {
		return this.reservedBit[row * this.size + col] === 1;
	}

}
