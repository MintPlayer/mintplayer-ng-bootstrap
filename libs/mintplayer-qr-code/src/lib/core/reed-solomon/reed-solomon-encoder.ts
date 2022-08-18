import * as Polynomial from "./polynomial";

export class ReedSolomonEncoder {
	constructor(degree: number) {
		this.degree = degree;
		this.genPoly = null;

		if (this.degree) {
			this.initialize(this.degree);
		}
	}

	degree: number;
	genPoly: Uint8Array | null;

	initialize(degree: number) {
		this.degree = degree;
		this.genPoly = Polynomial.generateECPolynomial(this.degree);
	}

	encode(data: Uint8Array) {
		if (!this.genPoly) {
			throw new Error('Encoder was not initialized');
		}

		// Calculate EC for this data block
		// extends data size to data+genPoly size
		const paddedData = new Uint8Array(data.length + this.degree);
		paddedData.set(data);

		// The error correction codewords are the remainder after dividing the data codewords
		// by a generator polynomial
		const remainder = Polynomial.mod(paddedData, this.genPoly);
	  
		// return EC data blocks (last n byte, where n is the degree of genPoly)
		// If coefficients number in remainder are less than genPoly degree,
		// pad with 0s to the left to reach the needed number of coefficients
		const start = this.degree - remainder.length;
		if (start > 0) {
			const buff = new Uint8Array(this.degree);
			buff.set(remainder, start);
			
			return buff;
		}
	  
		return remainder;
	}
}