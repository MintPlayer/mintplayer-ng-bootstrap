const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initTables () {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP_TABLE[i] = x;
		LOG_TABLE[x] = i;

		x <<= 1 // multiply by 2
		
		// The QR code specification says to use byte-wise modulo 100011101 arithmetic.
		// This means that when a number is 256 or larger, it should be XORed with 0x11D.
		if (x & 0x100) {
			// similar to x >= 256, but a lot faster (because 0x100 == 256)
			x ^= 0x11D;
		}
	}
  
	// Optimization: double the size of the anti-log table so that we don't need to mod 255 to
	// stay inside the bounds (because we will mainly use this table for the multiplication of
	// two GF numbers, no more).
	// @see {@link mul}
	for (let i = 255; i < 512; i++) {
		EXP_TABLE[i] = EXP_TABLE[i - 255];
	}
}());

export function log(n: number) {
	if (n < 1) throw new Error('log(' + n + ')');
	return LOG_TABLE[n];
}

export function exp(n: number) {
	return EXP_TABLE[n];
}

export function mul(x: number, y: number) {
	if (x === 0 || y === 0) return 0;
	
	// should be EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255] if EXP_TABLE wasn't oversized
	// @see {@link initTables}
	return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}