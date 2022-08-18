export class BitMatrix {
	constructor(public size: number) {
		if (!size || size < 1) {
			throw new Error('BitMatrix size must be defined and greater than 0');
		}

		this.data = Array(size * size).map(_ => false);
		this.reservedBit = Array(size * size).map(_ => false);
	}

	public data: boolean[];
	public reservedBit: boolean[];

	public set(row: number, col: number, value: boolean, reserved: boolean) {
		const index = row * this.size + col;
		this.data[index] = value;
		if (reserved) {
			this.reservedBit[index] = true;
		}
	}

	public get(row: number, col: number) {
		return this.data[row * this.size + col] ? 1 : 0;
	}

	public xor(row: number, col: number, value: boolean) {
		this.data[row * this.size + col] = (this.data[row * this.size + col] !== value);
	}

	public isReserved(row: number, col: number) {
		return this.reservedBit[row * this.size + col];
	}

}