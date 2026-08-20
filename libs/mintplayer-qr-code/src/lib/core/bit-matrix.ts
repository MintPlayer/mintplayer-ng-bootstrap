export class BitMatrix {
	constructor(public size: number) {
		if (!size || size < 1) {
			throw new Error('BitMatrix size must be defined and greater than 0');
		}

		// `.fill`, not `.map`: `Array(n)` is SPARSE, and `map` skips holes — so
		// `Array(n).map(() => false)` returns another sparse array of length n
		// containing nothing at all. `get` survived that (a hole reads falsy),
		// but `xor` did not: `undefined !== false` is `true`, so XOR-ing an
		// unwritten module with 0 turned it ON. Latent in the encoder, because
		// every module is written before masking runs — but this class is
		// exported, and the intent was never in doubt.
		this.data = new Array<boolean>(size * size).fill(false);
		this.reservedBit = new Array<boolean>(size * size).fill(false);
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