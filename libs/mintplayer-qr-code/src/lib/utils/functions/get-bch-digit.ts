export function getBCHDigit(data: number) {
	let digit = 0;

	while (data !== 0) {
		digit++;
		data >>>= 1;
	}

	return digit;
}
